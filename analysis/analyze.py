#!/usr/bin/env python3
"""
Mempool Transaction Analyzer

Connects to PostgreSQL database and provides transaction statistics
and analysis tools.
"""

import os
import argparse
from datetime import datetime, timedelta
from decimal import Decimal

import psycopg2
import pandas as pd
from dotenv import load_dotenv
from tabulate import tabulate

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    """Create database connection."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable not set")
    return psycopg2.connect(DATABASE_URL)


def load_transactions(hours: int = 24, chain_id: int = None) -> pd.DataFrame:
    """Load transactions from database."""
    conn = get_connection()

    query = """
        SELECT
            hash, "chainId", "from", "to", value, "gasPrice",
            "gasLimit", input, nonce, type, timestamp, status
        FROM "Transaction"
        WHERE timestamp >= %s
    """
    params = [datetime.now() - timedelta(hours=hours)]

    if chain_id:
        query += ' AND "chainId" = %s'
        params.append(chain_id)

    query += ' ORDER BY timestamp DESC'

    df = pd.read_sql_query(query, conn, params=params)
    conn.close()

    if len(df) == 0:
        return df

    # Convert values
    df["value_eth"] = df["value"].apply(lambda x: Decimal(x) / Decimal(10**18))
    df["gas_gwei"] = df["gasPrice"].apply(lambda x: Decimal(x) / Decimal(10**9))
    df["is_contract"] = df["input"].apply(lambda x: x and x != "0x" and len(x) > 2)

    return df


def overview(df: pd.DataFrame):
    """Print transaction overview."""
    if len(df) == 0:
        print("No transactions found.")
        return

    print("\n" + "=" * 60)
    print("TRANSACTION OVERVIEW")
    print("=" * 60)

    print(f"\nTotal Transactions: {len(df):,}")
    print(f"Unique Senders: {df['from'].nunique():,}")
    print(f"Unique Recipients: {df['to'].nunique():,}")

    # Status breakdown
    print("\nStatus Breakdown:")
    status_counts = df["status"].value_counts()
    for status, count in status_counts.items():
        pct = count / len(df) * 100
        print(f"  {status}: {count:,} ({pct:.1f}%)")

    # Chain breakdown
    if df["chainId"].nunique() > 1:
        print("\nBy Chain:")
        chain_counts = df["chainId"].value_counts()
        for chain_id, count in chain_counts.items():
            pct = count / len(df) * 100
            print(f"  Chain {chain_id}: {count:,} ({pct:.1f}%)")

    # Contract interactions
    contract_txs = df["is_contract"].sum()
    print(f"\nContract Interactions: {contract_txs:,} ({contract_txs/len(df)*100:.1f}%)")


def gas_analysis(df: pd.DataFrame):
    """Analyze gas prices."""
    if len(df) == 0:
        print("No transactions found.")
        return

    print("\n" + "=" * 60)
    print("GAS PRICE ANALYSIS (Gwei)")
    print("=" * 60)

    gas_prices = df["gas_gwei"].astype(float)

    print(f"\nMinimum: {gas_prices.min():.2f}")
    print(f"Maximum: {gas_prices.max():.2f}")
    print(f"Mean: {gas_prices.mean():.2f}")
    print(f"Median: {gas_prices.median():.2f}")
    print(f"Std Dev: {gas_prices.std():.2f}")

    # Percentiles
    print("\nPercentiles:")
    for pct in [25, 50, 75, 90, 95, 99]:
        val = gas_prices.quantile(pct / 100)
        print(f"  {pct}th: {val:.2f} Gwei")


def top_senders(df: pd.DataFrame, limit: int = 10):
    """Show top senders by transaction count."""
    if len(df) == 0:
        print("No transactions found.")
        return

    print("\n" + "=" * 60)
    print(f"TOP {limit} SENDERS BY TRANSACTION COUNT")
    print("=" * 60)

    sender_stats = df.groupby("from").agg({
        "hash": "count",
        "value_eth": "sum",
        "gas_gwei": "mean"
    }).rename(columns={
        "hash": "tx_count",
        "value_eth": "total_value_eth",
        "gas_gwei": "avg_gas_gwei"
    })

    sender_stats = sender_stats.sort_values("tx_count", ascending=False).head(limit)

    table_data = []
    for addr, row in sender_stats.iterrows():
        table_data.append([
            f"{addr[:10]}...{addr[-8:]}",
            row["tx_count"],
            f"{float(row['total_value_eth']):.4f}",
            f"{float(row['avg_gas_gwei']):.2f}"
        ])

    print(tabulate(
        table_data,
        headers=["Address", "TX Count", "Total ETH", "Avg Gas (Gwei)"],
        tablefmt="simple"
    ))


def top_recipients(df: pd.DataFrame, limit: int = 10):
    """Show top recipients by transaction count."""
    if len(df) == 0:
        print("No transactions found.")
        return

    print("\n" + "=" * 60)
    print(f"TOP {limit} RECIPIENTS BY TRANSACTION COUNT")
    print("=" * 60)

    # Filter out contract creation (null to)
    recipients_df = df[df["to"].notna()]

    recipient_stats = recipients_df.groupby("to").agg({
        "hash": "count",
        "value_eth": "sum"
    }).rename(columns={
        "hash": "tx_count",
        "value_eth": "total_received_eth"
    })

    recipient_stats = recipient_stats.sort_values("tx_count", ascending=False).head(limit)

    table_data = []
    for addr, row in recipient_stats.iterrows():
        table_data.append([
            f"{addr[:10]}...{addr[-8:]}",
            row["tx_count"],
            f"{float(row['total_received_eth']):.4f}"
        ])

    print(tabulate(
        table_data,
        headers=["Address", "TX Count", "Total ETH Received"],
        tablefmt="simple"
    ))


def time_analysis(df: pd.DataFrame):
    """Analyze transaction patterns over time."""
    if len(df) == 0:
        print("No transactions found.")
        return

    print("\n" + "=" * 60)
    print("TIME ANALYSIS")
    print("=" * 60)

    df["hour"] = pd.to_datetime(df["timestamp"]).dt.hour

    hourly = df.groupby("hour").size()

    print("\nTransactions by Hour (UTC):")
    for hour in range(24):
        count = hourly.get(hour, 0)
        bar = "#" * (count // max(1, max(hourly) // 40))
        print(f"  {hour:02d}:00 | {bar} {count}")


def value_analysis(df: pd.DataFrame):
    """Analyze transaction values."""
    if len(df) == 0:
        print("No transactions found.")
        return

    print("\n" + "=" * 60)
    print("VALUE ANALYSIS")
    print("=" * 60)

    values = df["value_eth"].astype(float)

    # Filter out zero-value transactions for meaningful stats
    non_zero = values[values > 0]

    print(f"\nAll Transactions:")
    print(f"  Zero-value: {(values == 0).sum():,} ({(values == 0).sum()/len(values)*100:.1f}%)")
    print(f"  With value: {len(non_zero):,} ({len(non_zero)/len(values)*100:.1f}%)")

    if len(non_zero) > 0:
        print(f"\nNon-zero Value Transactions:")
        print(f"  Total Volume: {non_zero.sum():.4f} ETH")
        print(f"  Mean: {non_zero.mean():.6f} ETH")
        print(f"  Median: {non_zero.median():.6f} ETH")
        print(f"  Max: {non_zero.max():.4f} ETH")

        # Value buckets
        print("\nValue Distribution:")
        buckets = [
            (0, 0.001, "< 0.001 ETH"),
            (0.001, 0.01, "0.001-0.01 ETH"),
            (0.01, 0.1, "0.01-0.1 ETH"),
            (0.1, 1, "0.1-1 ETH"),
            (1, 10, "1-10 ETH"),
            (10, float('inf'), "> 10 ETH")
        ]

        for low, high, label in buckets:
            count = ((non_zero >= low) & (non_zero < high)).sum()
            pct = count / len(non_zero) * 100
            print(f"  {label}: {count:,} ({pct:.1f}%)")


def full_report(df: pd.DataFrame):
    """Generate full analysis report."""
    overview(df)
    gas_analysis(df)
    value_analysis(df)
    top_senders(df)
    top_recipients(df)
    time_analysis(df)


def main():
    parser = argparse.ArgumentParser(description="Mempool Transaction Analyzer")
    parser.add_argument("--hours", type=int, default=24, help="Hours of data to analyze")
    parser.add_argument("--chain", type=int, help="Filter by chain ID")
    parser.add_argument("--report", choices=["full", "overview", "gas", "senders", "recipients", "time", "value"],
                        default="full", help="Type of report")
    parser.add_argument("--limit", type=int, default=10, help="Limit for top N lists")

    args = parser.parse_args()

    print(f"Loading transactions from last {args.hours} hours...")
    df = load_transactions(hours=args.hours, chain_id=args.chain)
    print(f"Loaded {len(df):,} transactions")

    reports = {
        "full": full_report,
        "overview": overview,
        "gas": gas_analysis,
        "senders": lambda d: top_senders(d, args.limit),
        "recipients": lambda d: top_recipients(d, args.limit),
        "time": time_analysis,
        "value": value_analysis,
    }

    reports[args.report](df)


if __name__ == "__main__":
    main()
