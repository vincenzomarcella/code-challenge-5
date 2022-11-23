"use strict";
require("dotenv").config();

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, DeleteCommand, ScanCommand, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb"); 
const { TICKETS_TABLE_ID } = process.env;

const { v4: uuidv4 } = require('uuid');
uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

const fetch = async (event) => {
    // init the client
    const client = new DynamoDBClient();
    const doc = DynamoDBDocumentClient.from(client)

    console.debug("EVENT: ", JSON.stringify(event))

    if (event.pathParameters.ticketID) {
        const ticketID = event.pathParameters.ticketID
        console.debug("TICKET ID: ", ticketID)
        try {
            const res = await doc.send(
                new GetCommand({
                    Key: {
                        id: ticketID
                    },
                    TableName: TICKETS_TABLE_ID
                })
            );

            console.log("RES: " + JSON.stringify(res));

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
                    message: "Error while fetching tickets",
                    error: err,
                }),
            };
        }
    } else {
        const params = {
            TableName: TICKETS_TABLE_ID,
            Limit: 10
        }
        if (event.pathParameters.nextToken) {
            params["ExclusiveStartKey"] = {
                id: event.pathParameters.nextToken
            }
        }
        try {
            const res = await doc.send(
                new ScanCommand(params)
            );

            console.log("RES: " + JSON.stringify(res));

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

const update = async (event) => {
    console.debug("UPDATE EVENT: ", JSON.stringify(event))
    const ticketID = event.pathParameters.ticketID

    const body = JSON.parse(event.body)
    console.debug("EVENT BODY: ", JSON.stringify(body))

    if (!ticketID || (!body.updates.priority && !body.updates.description)) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "Invalid input",
            }),
        };
    }

    let updateExpression = "SET "
    let expressionAttributeNames = {}
    let expressionAttributeValues = {}

    for(const attribute in body.updates) {
        const expressionAttributeName = `#${attribute}`
        const expressionAttributeValue = `:${attribute}`
        updateExpression = updateExpression + ` ${expressionAttributeName} = ${expressionAttributeValue},`
        expressionAttributeValues[expressionAttributeValue] = `${body.updates[attribute]}`
        expressionAttributeNames[expressionAttributeName] = `${attribute}`
    }

    updateExpression = updateExpression.slice(0, -1); 

    console.debug("UPDATE EXPRESSION: ", JSON.stringify(updateExpression))
    console.debug("EXPRESSION ATTRIBUTE VALUES: ", JSON.stringify(expressionAttributeValues))
    console.debug("EXPRESSION ATTRIBUTE NAMES: ", JSON.stringify(expressionAttributeNames))

    try {
        // init the client
        const client = new DynamoDBClient();
        const doc = DynamoDBDocumentClient.from(client)

        const res = await doc.send(
            new UpdateCommand({
                TableName: TICKETS_TABLE_ID,
                Key: {
                    id: ticketID
                },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: "ALL_NEW"
            })
        );

        console.log("RES: " + JSON.stringify(res));

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
    const body = JSON.parse(event.body);
    //console.log("BODY: " + JSON.stringify(body));

    /*
    // validate input
    if (!body.name || !body.surname)
        return {
        statusCode: 400,
        body: JSON.stringify({
            message: "Invalid input",
        }),
        };
        */
    // build item accordingly to the domain
    const ticket = {
        id: uuidv4(),
        priority: body.ticket.priority,
        status: "open",
        submissionDate: new Date().toISOString(),
        description: body.ticket.description
    };

    console.debug("TICKET: ", JSON.stringify(ticket))

    try {
        // init the client
        const client = new DynamoDBClient();
        const doc = DynamoDBDocumentClient.from(client)

        const res = await doc.send(
            new PutCommand({
                TableName: TICKETS_TABLE_ID,
                Item: ticket,
                ConditionExpression: "attribute_not_exists(id)",
            })
        );

        console.log("RES: " + JSON.stringify(res));

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
    const ticketID = event.pathParameters.ticketID
    console.debug("TICKET ID: ", JSON.stringify(ticketID))
    try {
        const client = new DynamoDBClient();
        const doc = DynamoDBDocumentClient.from(client)

        const res = await doc.send(
            new DeleteCommand({
                Key: {
                    id: ticketID
                },
                TableName: TICKETS_TABLE_ID
            })
        );

        console.log("RES: " + JSON.stringify(res));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Ticket with id " + ticketID + " has been deleted!"
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

module.exports = {
    fetch,
    update,
    open,
    close
}
