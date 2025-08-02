NAV_INDEX_NAME = "fund_nav_history"
NAV_INDEX_MAPPING = {
    "mappings": {
        "properties": {
            "isin": {"type": "keyword"},
            "last_updated_date": {"type": "date"},
            "history": {
                "type": "nested", # Use 'nested' to query array objects independently
                "properties": {
                    "date": {"type": "date"},
                    "nav": {"type": "float"}
                }
            },
            "returns": {
                "type": "object",
                "properties": {
                    "xirr_6m": {"type": "float"},
                    "xirr_1y": {"type": "float"},
                    "xirr_3y": {"type": "float"},
                    "xirr_5y": {"type": "float"},
                    "xirr_10y": {"type": "float"},
                    "xirr_all": {"type": "float"}
                }
            }
        }
    }
}

MUTUALFUND_INDEX_NAME = "mutualfund_list"
MUTUALFUND_INDEX_MAPPING = {
    "mappings": {
        "properties": {
            "isin": {"type": "keyword"},
            "mf_name": {"type": "text"},
            "mf_schema_code": {"type": "integer"},
            "start_date": {"type": "date"},
            "aum": {"type": "float"},
            "exit_load": {"type": "text"},
            "expense_ratio": {"type": "text"},
            "type": {"type": "keyword"},
            "latest_nav": {"type": "float"},
            "latest_nav_date": {"type": "date"},
            "returns": {
                "type": "object",
                "properties": {
                    "xirr_6m": {"type": "float"},
                    "xirr_1y": {"type": "float"},
                    "xirr_3y": {"type": "float"},
                    "xirr_5y": {"type": "float"},
                    "xirr_10y": {"type": "float"},
                    "xirr_all": {"type": "float"}
                }
            }
        }
    }
}
