# AWS API Gateway CRUD REST API - Support tickets case

## The Challenge

Build a Serverless Framework REST API with AWS API Gateway which supports CRUD functionality (Create, Read, Update, Delete) *don't use service proxy integration directly to DynamoDB from API Gateway

Please use GitHub Actions CI/CD pipeline, AWS CodePipeline, or Serverless Pro CI/CD to handle deployments.

You can take screenshots of the CI/CD setup and include them in the README.

The CI/CD should trigger a deployment based on a git push to the master branch which goes through and deploys the backend Serverless Framework REST API and any other resources e.g. DynamoDB Table(s).

### Requirements

0. All application code must be written using NodeJS, Typescript is acceptable as well

1. All AWS Infrastructure needs to be automated with IAC using [Serverless Framework](https://www.serverless.com)

2. The API Gateway REST API should store data in DynamoDB

3. There should be 4-5 lambdas that include the following CRUD functionality (Create, Read, Update, Delete) *don't use service proxy integration directly to DynamoDB from API Gateway

3. Build the CI/CD pipeline to support multi-stage deployments e.g. dev, prod

4. The template should be fully working and documented

4. A public GitHub repository must be shared with frequent commits

5. A video should be recorded (www.loom.com) of you talking over the application code, IAC, and any additional areas you want to highlight in your solution to demonstrate additional skills

Please spend only what you consider a reasonable amount of time for this.

## Optionally

Please feel free to include any of the following to show additional experience:

1. Make the project fit a specific business case e.g. Coffee Shop APIs vs Notes CRUD directly from AWS docs
2. AWS Lambda packaging
3. Organization of YAML files
4. Bash/other scripts to support deployment
5. Unit tests, integration tests, etc

## The answer
To tackle all the points in the challenge I have implemented the following business case: a support ticket API where tickets can be fetched, opened, closed and updated. I chose this use case specifically because it allowed me to implement CRUD functionality in a way that allowed me some freedom beyond simply implementing four Lambda functions.

### The architecture
The architecture is fairly simple. It has one `resource` stack to hold all the data regarding support **tickets** and a `service` stack where the **apis** are.

### The tickets resource stack
This stack simply contains the `ticketsTable` DynamoDB table where the ticket data is stored, it has the following parameters:
|Name          |Data type|
|--------------|---------|
|id            |`S`      |
|priority      |`S`      |
|status        |`S`      |
|submissionDate|`S`      |

While the `KeySchema` simply has its `HASH` key set as the `id`.

The table also has two `GlobalSecondaryIndexes` that can be queried but they have not been implemented in this api. They are:
|Index Name  |Hash Key  |Range Key       |Projection Type|
|------------|----------|----------------|---------------|
|`byPriority`|`priority`|`submissionDate`|`ALL`          |
|`byStatus`  |`status`  |`submissionDate`|`ALL`          |

The stack has as outputs the ID and Arn of the `ticketsTable` and the `stackName` itself. These outputs are used for cross-stack references.

### The api service stack
This stack is definitely the juicier one. It has been created using the HTTP API - NodeJs template from Serverless. First and foremost this stack has a reference to the tickets resource stack in the form of an environment variable passed through `serverless-compose`. As a matter of fact deploying the api stack by itself will not work, this is due to the fact that it needs references to an external resource, this is where Serverless Compose comes in. It simply allows us to get the `stackName` output from the resource stack and pass it to this stack in the form of a simply accessible parameter. 
Another thing to note is that this stack will obviously has Lambda functions, as such two plugins have been employed. The first one is `serverless-webpack`, through its use we can individually package the functions and reduce the package size while also potentially increasing performance. The second one is `serverless-iam-roles-per-function` that allows us to define the statement in a compact and easy manner. It also has as outputs the `AwsRegion` and the Arn and ID of the `ticketsTable`, this is necessary for testing as we need the references to such resources to access them.
#### **The API**
This API is made up of 5 different resources, 2 of the for **retrieving**, one for **creating**, one for **updating** and one for **deleting**.

- To retrieve tickets there are two ways, one to retrieve a single ticket and one to retrieve multiple tickets in a paginated manner. The single ticket can be fetched by the path `/tickets/{ticketID}` with the method `GET`, thus by passing the ID the caller can retrieve the ticket. The response body is structured in the following way:
```JSON
{
    "ticket": {
        "<attributes>": "<values>"
    }
}
```

- The paginated tickets can be retrieved by the path `/{nextTokne}` with the method `GET`, here the caller can pass a `nextToken` that is returned in the response body to fetch more tickets. For the sake of this exercise the number of tickets returned is 10, way lower that it could be but useful for the purposes of demonstrating this mechanism. The body of the response is structured in the following way:
```JSON
{
    "tickets": ["<ticket objects>"],
    "nextToken": "<nextToken>"
}
```
It is important to note that when all the pages have been fetched the nextToken returned will be `null`.

- To open(create) a ticket a `POST` request using the path `/tickets/open` can be done. By passing to it a request body structured in the following manner a ticket will then be created.
```JSON
{
    "ticket": {
        "priority": "<priority>",
        "description": "<description>"
    }
}
```
Once the ticket has been successfully created, the response body will be the following:
```JSON
{
    "ticket": {
        "<attributes>": "<values>"
    }
}
```

- To update a ticket, a `POST` request to the path `/tickets/update/{ticketID}` can be done, and by passing in the body, either one or both of the attributes specified in the following request body, the ticket will be updated.
```JSON
{
    "updates": {
        "priority": "<priority>",
        "description": "<description>"
    }
}
```
The returned request body will be in the following format:
```JSON
{
    "ticket": {
        "<attributes>": "<values>"
    }
}
```
- And finally, to delete a ticket a simple `DELETE` request to the path `/tickets/close/{ticketID}` can be done. The response body will be the following:
```JSON
{
    "message": "Ticket with id <ticketID> has been deleted!"
}
```

#### **The testing**
To test these APIs Jest has been used. Only integration testing was used given that unit testing was rather superfluous as there is really no complex business logic to be tested and also the fact that we mainly want to verify the functionality of the API endpoints themselves.
To do so two utilities have been used. One is `_scripts/export-env.js` which simply takes the output variables from the CloudFormation stack and puts them in the `.env` file. And the other onee is `_lib/http-call.js` which allows me to perform API call with a simple parameter structure. Given these things the test also uses a file called `given.js` which can be found in the `_tests` folder together with the integration test itself that is used to create some data necessary for some of the tests. The integration test itself is fairly straightforward making simple api calls and checking whether the return values are coherent.


### CI/CD
CI/CD has been handles using **GitHub Actions** for the sake of simplicity. Two pipelines have been defined, one being the `CI` pipeline that at every push on the repo deploys an ephemeral environment to run all the tests, if the tests succeed the environment is taken down, otherwise if there is an error the environment will stay there as the logs may be necessary for debugging. The `Deploy` pipeline is used for pull requests and pushes on the `dev`, `staging` and `prod` branches, it simply deploys the environment to a stage with the same name as the branch.