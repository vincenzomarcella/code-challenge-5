require("dotenv").config();
const { TICKETS_TABLE_ID } = process.env;

const uuid = require("uuid")
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb"); 

// utility method that performs a PutItem operation given a ticket
const putTicket = async (ticket) => {
    // create dynamo client
    const client = new DynamoDBClient();
    const doc = DynamoDBDocumentClient.from(client)

    // perform putItem
    await doc.send(
        new PutCommand({
            TableName: TICKETS_TABLE_ID,
            Item: ticket,
            ConditionExpression: "attribute_not_exists(id)",
        })
    );
}

// utility method that creates 30 randomly generated tickets
const someRandomTickets = async () => {
    const tickets = []
    const ticketsPromises = []
    for (let i = 0; i < 30; i++) {
        // create ticket object
        let ticket = {
            id: uuid.v4(),
            status: "open",
            submissionDate: new Date().toISOString(),
            priority: "high",
            description: "this is the description of ticket " + i
        }
        tickets.push(ticket)
        ticketsPromises.push(putTicket(ticket))
    }
    await Promise.all(ticketsPromises)
    console.debug("CREATED ALL TICKETS")
    return tickets
}

// utility method that creates some partial ticket data for testing
const someTicketData = async () => {
    return {
        priority: "high",
        description: "this is the description of a random ticket"
    }
}

module.exports = {
    someRandomTickets,
    someTicketData
}