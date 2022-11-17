require("dotenv").config();
const https = require("https");
let urlParse = require("url").URL;

module.exports = async (url, path, method, body) => {
  let endpoint = new urlParse(url).hostname.toString();

  let req = {
    hostname: endpoint,
    path: path,
    method: method,
  };

  if (req.method != "GET") {
    req.headers = {
      "Content-Type": "application/json",
      "Content-Length": JSON.stringify(body).length,
    };
  }

  // IF YOU WANT TO DOUBLE CHECK YOUR REQUEST
  // console.log("REQUEST: " + JSON.stringify(req));
  // console.log("BODY: " + JSON.stringify(body));

  const data = await new Promise((resolve, reject) => {
    const httpRequest = https.request(req, (res) => {
      const chunks = [];
      res.on("data", (data) => {
        chunks.push(data);
      });

      res.on("end", () => {
        resultdata = JSON.parse(Buffer.concat(chunks).toString());
        if (resultdata.errors != null) {
          reject(JSON.stringify(resultdata, null, 4));
        } else {
          resolve(resultdata);
        }
      });

      res.on("error", (err) => {
        reject(() => {
          return JSON.parse(err.toString());
        });
      });
    });

    if (req.method != "GET") httpRequest.write(JSON.stringify(body));
    httpRequest.end();
  });

  return data;
};