require("dotenv").config();

const { TICKETS_TABLE_ID } = process.env;
const uuid = require("uuid")
const httpCall = require("../_lib/http-call");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, PutCommand, ScanCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb"); 


const putTicket = async (ticket) => {
    const client = new DynamoDBClient();
    const doc = DynamoDBDocumentClient.from(client)

    const res = await doc.send(
        new PutCommand({
            TableName: TICKETS_TABLE_ID,
            Item: ticket,
            ConditionExpression: "attribute_not_exists(id)",
        })
    );

    //console.log("RES: " + JSON.stringify(res));
}

const someRandomTickets = async () => {
    const tickets = []
    const ticketsPromises = []
    for (let i = 0; i < 30; i++) {
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
    //console.debug("TICKETS: ", JSON.stringify(tickets))
    await Promise.all(ticketsPromises)
    console.debug("CREATED ALL TICKETS")
    return tickets
}

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