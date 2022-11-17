require("dotenv").config();

const { HTTP_API_URL } = process.env;

const httpCall = require("../../_lib/http-call");
//const given = require("../given");

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
  
describe("A random user goes to retrieve the support tickets", () => {
    jest.setTimeout(100000);

    it("Can retrieve the homepage data", async () => {
        const res = await httpCall(HTTP_API_URL, "/", "GET", null);

        //console.log(JSON.stringify(res));

        expect(res).toMatchObject({
            message: expect.any(String),
            endpoint: expect.any(String),
        });
    });
});

