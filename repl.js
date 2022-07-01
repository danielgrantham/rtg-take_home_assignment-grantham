/*----------------------------------------------------------------------------------------------------
                                    ***** REQUIREMENTS *****
----------------------------------------------------------------------------------------------------*/

const readline  = require('readline')
const config    = require('./config.js')
const fs        = require('fs')




/*----------------------------------------------------------------------------------------------------
                                    ***** STORAGE *****
----------------------------------------------------------------------------------------------------*/

// This section would hold code for a DB or a File for persistent storage

let storage = {
    products:   {},
    warehouses: {}
}

let inputCache          = []
let userNotifiedOfError = false





/*----------------------------------------------------------------------------------------------------
                                    ***** MAIN *****
----------------------------------------------------------------------------------------------------*/

const rl = readline.createInterface(process.stdin, process.stdout);

rl.setPrompt('>')

rl.prompt()

rl.on('line', userInput => main(userInput))
rl.on('SIGINT', () => { console.log('\n'); process.exit() })

function main(userInput) {
    inputCache.push(userInput)

    const sanitizedInput    = sanitizeInput(userInput)
    const command           = extractCommand(sanitizedInput)
    const arguments         = extractArguments(sanitizedInput, command)
    const validArguments    = validateArguments(arguments, command)

    if (validArguments) {
        if (validArguments.allValid) {
            const argumentsObject = validArguments.results.reduce( (obj, result) => {
                obj[result.name] = result.value

                return obj
            }, {})

            let results = processInput({command: command.value, arguments: argumentsObject});

            if (results.success) {
                if (results.payload) console.log(`${results.payload}\n`)
            } else {
                console.log(results.reason)
            }
        } else {
            const message = validArguments.results.reduce( (error, result) => {
                if (!result.valid) {
                    error += `${result.reason} `
                }

                return error
            }, '')

            console.log(`ERROR: ${message.trim()}`)
        }
    } else {
        console.log(command.value)
    }

    rl.prompt()
}

// Log on FIFO model
setInterval( () => log(), 1000)





/*----------------------------------------------------------------------------------------------------
                                    ***** TESTS *****
----------------------------------------------------------------------------------------------------*/

const filename = process.env.TESTFILE

if (filename) {
    const testFile = fs.readFileSync(`./tests/${filename}`, 'utf-8')

    testFile.split(/\r?\n/).forEach( line => {
        main(line)
    })
}





/*----------------------------------------------------------------------------------------------------
                                    ***** FUNCTIONS *****
----------------------------------------------------------------------------------------------------*/

function sanitizeInput(userInput) {
    let sanitizedInput  = userInput.trim()
    let doubleQuotes    = (sanitizedInput.match(/"/g) || []).length

    if (doubleQuotes > 2) {
        const firstIndex    = sanitizedInput.indexOf('"');
        const lastIndex     = sanitizedInput.lastIndexOf('"');

        sanitizedInput = sanitizedInput.substring(0, firstIndex + 1) + sanitizedInput.substring(firstIndex + 1, lastIndex).replace(/"/g, '\'') + sanitizedInput.substring(lastIndex)
    } else {
        // Placeholder for other scenarios for missused double quotes
    }

    // Placeholder for additional sanitization

    return sanitizedInput
}


function extractCommand(str) {
    const userInput = str.toUpperCase().split(' ')

    // Track the user's command for error feedback
    let userCommand = []

    // Loop through configured commands and match against user input
    for (let i = 0; i < config.commands.length; i++) {
        const option = config.commands[i]

        let validCommand = true

        userCommand = []

        option.forEach( (command, commandIndex) => {
            userCommand.push(userInput[commandIndex])

            if (command !== userInput[commandIndex]) validCommand = false
        })

        if (validCommand) return {
            success: true,
            value: option.join(' ')
        }
    }

    // Clean up results
    userCommand = userCommand.filter( el => { return el !== undefined })
    userCommand = userCommand.join(' ')

    return {
        success: false,
        value: `ERROR: Command not found [${userCommand}]`
    }
}


function extractArguments(str, command) {
    if ( !command.success ) return null

    // Look for opening and closing quotes separated by spaces
    const splitPattern = (str.includes('"')) ? / "|" /g : ' '
    let userArguments = str.substring(command.value.length + 1).split(splitPattern)

    // Strip wrapping quotes out of input arguments
    userArguments = userArguments.reduce( (filtered, str) => {
        if (str) {
            str = str.replace(/(^"|"$)/g, '')

            filtered.push(str.trim())

            return filtered
        }
    }, [])

    return userArguments
}


function validateArguments(userArguments, command) {
    if (userArguments === null) return null

    const expectedArguments = config.arguments[command.value]
    let allValid = true
    let results = []

    expectedArguments.forEach( (expectedArgument, i) => {
        const userArgumentExists = (userArguments?.[i]) ? true : false
        
        if (userArgumentExists) {
            // Update this section if new values are possible (e.g. boolean)
            const transformedArgument   = (expectedArgument.type === 'number') ? parseInt(userArguments[i]) : userArguments[i]
            let argumentTypeValid
            
            argumentTypeValid = (typeof transformedArgument === expectedArgument.type) ? true : false

            // NaN is considered a number.  This checks for that.
            argumentTypeValid = (expectedArgument.type === 'number' && isNaN(transformedArgument)) ? false : true

            if (argumentTypeValid) {
                results.push({
                    valid: true,
                    name: expectedArgument.name,
                    value: transformedArgument
                })
            } else {
                allValid = false

                results.push({
                    valid: false,
                    reason: `Expected a ${expectedArgument.type} for [${expectedArgument.name}]`
                })
            }
        } else {
            if (expectedArgument.required) {
                allValid = false

                results.push({
                    valid: false,
                    reason: `Missing required argument: [${expectedArgument.name}]`
                })
            }
        }
    })

    return {allValid, results}
}


function processInput(userInput) {
    let success = true
    let reason = null
    let payload = null
    let formattedPayload = []
    let PRODUCT_NAME, SKU, WAREHOUSE_NUM, STOCK_LIMIT, QTY
    let currentStock, currentStockLimit, difference

    switch (userInput.command) {
        case 'ADD PRODUCT':
            PRODUCT_NAME = userInput.arguments['PRODUCT NAME']
            SKU = userInput.arguments.SKU

            // Check if product sku already exists
            if (SKU in storage.products) {
                success = false
                reason = `SKU ${SKU} already exists.  Product was not added.`
            } else {
                // Add product to catalog
                storage.products[SKU] = PRODUCT_NAME
            }

            break    
        case 'ADD WAREHOUSE':
            WAREHOUSE_NUM = userInput.arguments['WAREHOUSE#']
            STOCK_LIMIT   = userInput.arguments.STOCK_LIMIT || Infinity

            if (WAREHOUSE_NUM in storage.warehouses) {
                if (storage.warehouses[WAREHOUSE_NUM].stock_limit !== STOCK_LIMIT) {
                    // Prompt user to determine action
                    rl.question(`WAREHOUSE [${WAREHOUSE_NUM}] already exists.  Update STOCK_LIMIT from [${storage.warehouses[WAREHOUSE_NUM].stock_limit}] to [${STOCK_LIMIT}]? (y/n) `, answer => {
                        if (answer.toLowerCase() === 'y') {
                            storage.warehouses[WAREHOUSE_NUM].stock_limit = STOCK_LIMIT
                        } else {
                            console.log(`${(answer.toLowerCase() === 'n') ? '' : 'Please enter y or n.  '}Warehouse stock limit not updated.`)
                        }

                        rl.prompt()
                    })
                }
            } else {
                storage.warehouses[WAREHOUSE_NUM] = {
                    stock_limit: STOCK_LIMIT || Infinity,
                    stock: {}
                }
            }
        
            break
        case 'STOCK':
            /* !!! If making significant changes to this code block, consider combining STOCK/UNSTOCK into a single function !!! */

            SKU             = userInput.arguments.SKU
            WAREHOUSE_NUM   = userInput.arguments['WAREHOUSE#']
            QTY             = userInput.arguments.QTY

            if ( !(SKU in storage.products) )               { success = false;  reason = `SKU [${SKU}] not in product catalog.  Please add the product before attempting to stock.`                 }
            if ( !(WAREHOUSE_NUM in storage.warehouses) )   { success = false;  reason = `Warehouse # [${WAREHOUSE_NUM}] not found.  Please add the warehouse number before attempting to stock.`;  }

            if (!success) break

            currentStock        = Object.keys(storage.warehouses[WAREHOUSE_NUM].stock).reduce( (length, sku) => length += storage.warehouses[WAREHOUSE_NUM].stock[sku], 0)
            currentStockLimit   = storage.warehouses[WAREHOUSE_NUM].stock_limit

            if (currentStock + QTY <= currentStockLimit) {
                if (SKU in storage.warehouses[WAREHOUSE_NUM].stock) {
                    storage.warehouses[WAREHOUSE_NUM].stock[SKU] += QTY
                } else {
                    storage.warehouses[WAREHOUSE_NUM].stock[SKU] = QTY
                }
            } else {
                difference = (currentStock + QTY) - currentStockLimit

                // Prompt user to determine action
                rl.question(`Warehouse [${WAREHOUSE_NUM}] currenty has [${currentStock}] products stocked and a limit of [${currentStockLimit}].  Would you like to add [${difference}] instead of [${QTY}] to stay within limit? (y/n) `, answer => {
                    if (answer.toLowerCase() === 'y') {
                        if (SKU in storage.warehouses[WAREHOUSE_NUM].stock) {
                            storage.warehouses[WAREHOUSE_NUM].stock[SKU] += difference
                        } else {
                            storage.warehouses[WAREHOUSE_NUM].stock[SKU] = QTY
                        }
                    } else {
                        console.log(`${(answer.toLowerCase() === 'n') ? '' : 'Please enter y or n.  '}No stock added.`)
                    }

                    rl.prompt()
                })
            }

            break    
        case 'UNSTOCK':
            /* !!! If making significant changes to this code block, consider combining STOCK/UNSTOCK into a single function !!! */

            SKU             = userInput.arguments.SKU
            WAREHOUSE_NUM   = userInput.arguments['WAREHOUSE#']
            QTY             = userInput.arguments.QTY

            if ( !(WAREHOUSE_NUM in storage.warehouses) )   { success = false;  reason = `Warehouse # [${WAREHOUSE_NUM}] not found.  No changes made.`          }
            if ( WAREHOUSE_NUM in storage.warehouses) {
                // Checks SKU against warehouse instead of product catalog in case product has been discontinued but is still in stock
                if ( !(SKU in storage.warehouses[WAREHOUSE_NUM].stock) )   { success = false;  reason = `SKU [${SKU}] not in warehouse [${WAREHOUSE_NUM}].  No changes made.`  }
            }

            if (!success) break

            currentStock = storage.warehouses[WAREHOUSE_NUM].stock[SKU]

            if (currentStock - QTY >= 0) {
                storage.warehouses[WAREHOUSE_NUM].stock[SKU] = currentStock - QTY
            } else {
                // Prompt user to determine action
                rl.question(`Warehouse [${WAREHOUSE_NUM}] currently has a stock of [${currentStock}] for SKU [${SKU}].  Would you like to reduce stock to 0? (y/n) `, answer => {
                    if (answer.toLowerCase() === 'y') {
                        delete storage.warehouses[WAREHOUSE_NUM].stock[SKU]
                    } else {
                        console.log(`${(answer.toLowerCase() === 'n') ? '' : 'Please enter y or n.  '}No changes made.`)
                    }

                    rl.prompt()
                })
            }

            break
        case 'LIST PRODUCTS': // TODO - Find out character limits for all values
            Object.keys(storage.products).forEach( (key, i) => {
                formattedPayload.push(`${key}\t${storage.products[key]}`)
            })

            payload = formattedPayload.join('\n')

            break    
        case 'LIST WAREHOUSES':
            formattedPayload = ['WAREHOUSE #\t\t\tSTOCK LIMIT']

            Object.keys(storage.warehouses).forEach( (key, i) => {
                formattedPayload.push(`${key}\t\t\t\t${storage.warehouses[key].stock_limit}`)
            })

            payload = formattedPayload.join('\n')
        
            break
        case 'LIST WAREHOUSE':
            WAREHOUSE_NUM = userInput.arguments['WAREHOUSE#']

            if ( !(WAREHOUSE_NUM in storage.warehouses) )   { success = false;  reason = `Warehouse [${WAREHOUSE_NUM}] does not exist`  }

            if ( !success ) break

            formattedPayload = ['ITEM NAME\t\t\t\t\tSKU\t\t\t\t\t\tQTY']
            
            if (Object.keys(storage.warehouses[WAREHOUSE_NUM].stock).length > 0) {
                Object.keys(storage.warehouses[WAREHOUSE_NUM].stock).forEach( sku => {
                    formattedPayload.push(`${storage.products[sku]}\t\t${sku}\t\t${storage.warehouses[WAREHOUSE_NUM].stock[sku]}`)
                })
            } else {
                formattedPayload.push('(Nothing in stock)')
            }

            payload = formattedPayload.join('\n')
            
            break
        default:
            break
    }

    if (success) {
        if (payload) { return {success, payload} } else { return {success} }
    } else {
        return {success, reason}
    }
}


function log() {
    if (inputCache.length >= 2) {
        fs.writeFile('command_history.txt', `${inputCache.splice(0, 2).join('\n')}\n`, {
            flag: 'a'
        }, err => {
            if (err) {
                if (!userNotifiedOfError) console.error('Command history not being recorded.  Please contact system administrators.')

                // So that user is only notified once if there is an error
                userNotifiedOfError = true
            }
        })
    }
}

// TODO - Based on feedback on character limits, create function to format whitespace in payloads