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