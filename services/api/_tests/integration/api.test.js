require("dotenv").config();
const { HTTP_API_URL, TICKETS_TABLE_ID } = process.env;

const httpCall = require("../../_lib/http-call");
const given = require("../given");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb"); 

// method that removes all tickets in the table
const removeAllTickets = async () => {
    // create dynamo client
    const client = new DynamoDBClient();
    const doc = DynamoDBDocumentClient.from(client)

    // perform scan
    const res = await doc.send(
        new ScanCommand({
            TableName: TICKETS_TABLE_ID,
        })
    );

    // for each ticket in the table
    for (const item of res.Items) {
        // perform a deleteItem
        await doc.send(new DeleteCommand({
            TableName: TICKETS_TABLE_ID,
            Key: {
                id: item.id
            }
        })
        )
    }

    console.debug("REMOVED ALL", res.Items.length ,"TICKETS!")
}

describe("A random unauthenticated user", () => {
    jest.setTimeout(100000);

    let tickets = [];

    // object that is supposed to contain partial data to test ticket open
    let ticketData = {};
    // object that will contain the created ticket
    let ticketItem = {}

    beforeAll(async () => {
        // generate tickets
        tickets = await given.someRandomTickets()
        // generate partial ticket data
        ticketData = await given.someTicketData()
    });

    it("Can open a ticket", async () => {
        // perform call with the partial ticket data in the body
        const res = await httpCall(HTTP_API_URL, "/tickets/open", "POST", {ticket: ticketData});

        ticketItem = res.ticket

        expect(res).toMatchObject({
            ticket: {
                description: ticketData.description,
                priority: ticketData.priority
            }
        });
    });

    it("Can retrieve a single ticket", async () => {
        // perform the call passing the ticket id as a parameter
        const res = await httpCall(HTTP_API_URL, "/tickets/" + ticketItem.id, "GET", null);

        expect(res).toMatchObject({
            ticket: ticketItem
        });
    });

    it("Can update a ticket", async () => {
        // changes to be made to the ticket
        const ticketUpdates = {
            priority: "low",
            description: "This is the new description"
        }

        // expected new ticket
        const newTicketItem = {
            id: ticketItem.id,
            priority: ticketUpdates.priority,
            submissionDate: ticketItem.submissionDate,
            description: ticketUpdates.description
        }

        // perform the call using the ticket id sa parameter and the updates in the body
        const res = await httpCall(HTTP_API_URL, "/tickets/update/" + ticketItem.id, "POST", {updates: ticketUpdates});

        expect(res).toMatchObject({
            ticket: newTicketItem
        });
    });

    it("Can close a ticket", async () => {
        // perform the call passing the ticket id as parameter
        const res = await httpCall(HTTP_API_URL, "/tickets/close/" + ticketItem.id, "DELETE", null);

        expect(res).toMatchObject({
            message: "Ticket with id " + ticketItem.id + " has been deleted!",
        });
    });

    it("Can retrieve paginated tickets", async () => {
        // perform a simple call first
        const res = await httpCall(HTTP_API_URL, "/", "GET", null);

        // while in the response there is still a next token
        while (res.nextToken) {
            // perform a call with the encoded next token as parameter
            const temp = await httpCall(HTTP_API_URL, "/" + encodeURI(res.nextToken), "GET", null);
            // put the new next token in the response
            res.nextToken = temp.nextToken
            // add the tickets to the already fetched tickets
            res.tickets = res.tickets.concat(temp.tickets)
        }

        expect(res).toMatchObject({
            tickets: expect.arrayContaining(tickets),
            nextToken: undefined
        });
    });

    // after testing cleanup
    afterAll(async () => {
        await removeAllTickets()
    })
});

