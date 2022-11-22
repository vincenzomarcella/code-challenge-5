require("dotenv").config();

const { HTTP_API_URL, TICKETS_TABLE_ID } = process.env;

const httpCall = require("../../_lib/http-call");
const given = require("../given");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, PutCommand, ScanCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb"); 

const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const removeAllTickets = async () => {
    const client = new DynamoDBClient();
    const doc = DynamoDBDocumentClient.from(client)
    const res = await doc.send(
        new ScanCommand({
            TableName: TICKETS_TABLE_ID,
        })
    );

    //console.debug("SCANNED TICKETS TO REMOVE: " + JSON.stringify(res));

    for (const item of res.Items) {
        //console.debug("ITEM: ", JSON.stringify(item))
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
    let ticketData = {};
    let ticketItem = {}

    beforeAll(async () => {
        tickets = await given.someRandomTickets()
        ticketData = await given.someTicketData()
    });

    it("Can open a ticket", async () => {

        const res = await httpCall(HTTP_API_URL, "/tickets/open", "POST", {ticket: ticketData});

       console.debug("OPEN TICKET RESPONSE: ", JSON.stringify(res));
        ticketItem = res.ticket

        expect(res).toMatchObject({
            ticket: {
                description: ticketData.description,
                priority: ticketData.priority
            }
        });
    });

    it("Can retrieve a single ticket", async () => {
        console.debug("TICKET ITEM ID: ", ticketItem.id)
        const res = await httpCall(HTTP_API_URL, "/tickets/" + ticketItem.id, "GET", null);

        console.log("SINGLE TICKET FETCH RESULT: ", JSON.stringify(res));

        expect(res).toMatchObject({
            ticket: ticketItem
        });
    });

    it("Can update a ticket", async () => {
        const ticketUpdates = {
            priority: "low",
            description: "This is the new description"
        }

        const newTicketItem = {
            id: ticketItem.id,
            priority: ticketUpdates.priority,
            submissionDate: ticketItem.submissionDate,
            description: ticketUpdates.description
        }

        const res = await httpCall(HTTP_API_URL, "/tickets/update/" + ticketItem.id, "POST", {updates: ticketUpdates});

        console.log("UPDATE TICKET RESPONSE: ", JSON.stringify(res));

        expect(res).toMatchObject({
            ticket: newTicketItem
        });
    });

    it("Can close a ticket", async () => {
        const res = await httpCall(HTTP_API_URL, "/tickets/close/" + ticketItem.id, "DELETE", null);

        //console.log(JSON.stringify(res));

        expect(res).toMatchObject({
            message: "Ticket with id " + ticketItem.id + " has been deleted!",
        });
    });

    it("Can retrieve paginated tickets", async () => {
        const res = await httpCall(HTTP_API_URL, "/", "GET", null);

        //console.log("PAGINATED TICKETS RESULT: ", JSON.stringify(res));

        expect(res).toMatchObject({
            tickets: expect.arrayContaining(tickets),
        });
    });

    afterAll(async () => {
        await removeAllTickets()
    })
});

