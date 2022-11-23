"use strict";
require("dotenv").config();

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, DeleteCommand, ScanCommand, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb"); 
const { TICKETS_TABLE_ID } = process.env;
const { v4: uuidv4 } = require('uuid');

// resolver for fetching single and multiple tickets
const fetch = async (event) => {
    // create dynamo client
    const client = new DynamoDBClient();
    const doc = DynamoDBDocumentClient.from(client)

    console.debug("FETCH EVENT: ", JSON.stringify(event))

    // if the ticket id is passed as parameter
    if (event.pathParameters.ticketID) {
        try {
            // perform a getItem with the passed id
            const res = await doc.send(
                new GetCommand({
                    Key: {
                        id: event.pathParameters.ticketID
                    },
                    TableName: TICKETS_TABLE_ID
                })
            );

            console.debug("RES: " + JSON.stringify(res));
            return {
                statusCode: 200,
                body: JSON.stringify({
                    ticket: res.Item
                }),
            };
        } catch (err) {
            return {
                statusCode: 503,
                body: JSON.stringify({
                    message: "Error while fetching ticket",
                    error: err,
                }),
            };
        }
    } else {
        // prepare default parameters for the scan
        const params = {
            TableName: TICKETS_TABLE_ID,
            Limit: 10
        }
        // if a next token is passed put it in the params
        if (event.pathParameters.nextToken) {
            params["ExclusiveStartKey"] = {
                id: event.pathParameters.nextToken
            }
        }
        try {
            // perform a scan with the generated params
            const res = await doc.send(
                new ScanCommand(params)
            );

            return {
                statusCode: 200,
                body: JSON.stringify({
                    tickets: res.Items,
                    nextToken: res.LastEvaluatedKey.id
                }),
            };
        } catch (err) {
            return {
                statusCode: 503,
                body: JSON.stringify({
                    message: "Error while fetching tickets",
                    error: err,
                }),
            };
        }
    }
}

// resolver for updating a single ticket
const update = async (event) => {
    console.debug("UPDATE EVENT: ", JSON.stringify(event))

    // parse request body
    const body = JSON.parse(event.body)

    // if there is no ticket id and no updates are passed return error
    if (!event.pathParameters.ticketID || (!body.updates.priority && !body.updates.description)) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "Invalid input",
            }),
        };
    }

    // variables where the update expression is generated
    let updateExpression = "SET "
    let expressionAttributeNames = {}
    let expressionAttributeValues = {}

    // for each update to do
    for(const attribute in body.updates) {
        // create expression attribute name and value
        const expressionAttributeName = `#${attribute}`
        const expressionAttributeValue = `:${attribute}`

        // add the attribute name and value to the expression
        updateExpression = updateExpression + ` ${expressionAttributeName} = ${expressionAttributeValue},`

        // add the attribute name and value to the params
        expressionAttributeValues[expressionAttributeValue] = `${body.updates[attribute]}`
        expressionAttributeNames[expressionAttributeName] = `${attribute}`
    }

    // remove trailing comma from update expression
    updateExpression = updateExpression.slice(0, -1); 

    console.debug("UPDATE EXPRESSION: ", JSON.stringify(updateExpression))
    console.debug("EXPRESSION ATTRIBUTE VALUES: ", JSON.stringify(expressionAttributeValues))
    console.debug("EXPRESSION ATTRIBUTE NAMES: ", JSON.stringify(expressionAttributeNames))

    try {
        // create dynamo client
        const client = new DynamoDBClient();
        const doc = DynamoDBDocumentClient.from(client)

        const res = await doc.send(
            new UpdateCommand({
                TableName: TICKETS_TABLE_ID,
                Key: {
                    id: event.pathParameters.ticketID
                },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                // return the updated object
                ReturnValues: "ALL_NEW"
            })
        );

        console.debug("RES: " + JSON.stringify(res));

        return {
            statusCode: 200,
            body: JSON.stringify({
                ticket: res.Attributes
            })
        };
    } catch (err) {
        return {
            statusCode: 503,
            body: JSON.stringify({
                message: "Error while updating the ticket",
                error: err,
            }),
        };
    }
}

const open = async (event) => {
    console.debug("OPEN EVENT: ", JSON.stringify(event))
    const body = JSON.parse(event.body);
    
    // validate input
    if (!body.ticket.priority || !body.ticket.description)
        return {
        statusCode: 400,
        body: JSON.stringify({
            message: "Invalid input",
        }),
    };

    // build the ticket data
    const ticket = {
        id: uuidv4(),
        priority: body.ticket.priority,
        status: "open",
        submissionDate: new Date().toISOString(),
        description: body.ticket.description
    };

    console.debug("GENERATED TICKET: ", JSON.stringify(ticket))

    try {
        // create dynamo client
        const client = new DynamoDBClient();
        const doc = DynamoDBDocumentClient.from(client)

        // perform putItem
        const res = await doc.send(
            new PutCommand({
                TableName: TICKETS_TABLE_ID,
                Item: ticket,
                ConditionExpression: "attribute_not_exists(id)",
            })
        );

        console.debug("RES: " + JSON.stringify(res));

        return {
            statusCode: 200,
            body: JSON.stringify({
                ticket: ticket
            })
        };
    } catch (err) {
        return {
            statusCode: 503,
            body: JSON.stringify({
                message: "Error while opening ticket",
                error: err,
            }),
        };
    }
}

const close = async (event) => {
    console.debug("TICKET ID: ", JSON.stringify(event.pathParameters.ticketID))
    try {
        // create dynamo client
        const client = new DynamoDBClient();
        const doc = DynamoDBDocumentClient.from(client)

        // perform deleteItem
        const res = await doc.send(
            new DeleteCommand({
                Key: {
                    id: event.pathParameters.ticketID
                },
                TableName: TICKETS_TABLE_ID
            })
        );

        console.log("RES: " + JSON.stringify(res));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Ticket with id " + event.pathParameters.ticketID + " has been deleted!"
            }),
        };
    } catch (err) {
        return {
            statusCode: 503,
            body: JSON.stringify({
                message: "Error while deleting ticket",
                error: err,
            }),
        };
    }
}

module.exports = {
    fetch,
    update,
    open,
    close
}
