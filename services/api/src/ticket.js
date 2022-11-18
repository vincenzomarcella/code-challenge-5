"use strict";
/*const {
  DynamoDBClient,
} = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, PutCommand } = require("@aws-sdk/lib-dynamodb"); 
*/

const fetch = async (event) => {
    console.debug("EVENT: ", JSON.stringify(event))
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Hello world!",
        }),
    };
}

const update = async (event) => {
    console.debug("UPDATE EVENT: ", JSON.stringify(event))
}

const open = async (event) => {
    console.debug("OPEN EVENT: ", JSON.stringify(event))
}

const close = async (event) => {
    console.debug("CLOSE EVENT: ", JSON.stringify(event))
}

module.exports = {
    fetch,
    update,
    open,
    close
}
