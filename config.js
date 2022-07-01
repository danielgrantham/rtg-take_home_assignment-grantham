module.exports = {
    commands: [
        ['ADD', 'PRODUCT'],
        ['ADD', 'WAREHOUSE'],
        ['STOCK'],
        ['UNSTOCK'],
        ['LIST', 'PRODUCTS'],
        ['LIST', 'WAREHOUSES'],
        ['LIST', 'WAREHOUSE']
    ],
    arguments: {
        'ADD PRODUCT': [
            { name: "PRODUCT NAME", type: 'string', required: true  },
            { name: "SKU",          type: 'string', required: true  }
        ],
        'ADD WAREHOUSE': [
            { name: 'WAREHOUSE#',   type: 'number', required: true  },
            { name: 'STOCK_LIMIT',  type: 'number', required: false }
        ],
        'STOCK': [
            { name: 'SKU',          type: 'string', required: true  },
            { name: 'WAREHOUSE#',   type: 'number', required: true  },
            { name: 'QTY',          type: 'number', required: true  }
        ],
        'UNSTOCK': [
            { name: 'SKU',          type: 'string', required: true  },
            { name: 'WAREHOUSE#',   type: 'number', required: true  },
            { name: 'QTY',          type: 'number', required: true  }
        ],
        'LIST PRODUCTS': [],
        'LIST WAREHOUSES': [],
        'LIST WAREHOUSE': [
            { name: 'WAREHOUSE#',   type: 'number', required: true  },
        ]
    }
}