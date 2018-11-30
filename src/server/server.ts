import * as HTTP from "http"
import * as GraphQL from "graphql"
import * as URL from "url"
import { graphQlSchema } from "../graphql/schemaWrapper";
import { getGraphQlTestStruct } from "../graphql/dataWrapper";

export class GraphQLServer {
    private httpServer: HTTP.Server

    constructor() {
        this.httpServer = HTTP.createServer(this.requestHandler)
    }

    public async start() {
        this.httpServer.listen(8080).on("error", (err) => {
            console.error("Server error:", err)
        })
    }

    public async close() {
        return new Promise((resolve) => {
            this.httpServer.close(() => {
                resolve()
            })
        })
    }

    private requestHandler(request: HTTP.IncomingMessage, response: HTTP.ServerResponse) {
        request.resume()
        if(request.method !== "POST" && (request.method === "GET" && (!request.url || (request.url
                && !URL.parse(request.url, true).query["query"]))
        )) {
            if(!request.method) {
                response.write("OK")
                response.statusCode = 200
                response.end()
                return
            }
            console.log(URL.parse(request.url!, true).query)
            switch(request.method.toUpperCase()) {
                case "GET": 
                    response.write("OK")
                case "HEAD":
                    response.statusCode = 200
                    break;
                default:
                    response.write("Method not allowed")
                    response.statusCode = 405
                    break;
            }
            response.end()
            return
        }

        let requestData = ""
        request.on("data", (data) => {
            if(data instanceof String || typeof(data) === "string") {
                requestData += data
            } else {
                requestData += data.toString()
            }
        }).on("error", (err) => {
            console.error("Failed to handle request:", err)
            response.write(JSON.stringify({
                data: null,
                errors: [buildGraphQlError(`Internal server error: ${err.message}`, [], [])]
            }))
            response.statusCode = 500
            response.end()
        }).on("end", () => {
            let inputData: GraphQlRequest
            response.setHeader("Content-Type", "application/json")
            response.setHeader("Connection", "close")
            try {
                if(request.method == "GET") {
                    inputData = handleRequestData( URL.parse(request.url!, true)
                        .query!["query"] as string, "GET")
                } else {
                    inputData = handleRequestData(requestData,
                        request.headers["content-type"]!)
                }
            } catch(e) {
                response.write(JSON.stringify({
                    data: null,
                    errors: [buildGraphQlError(e.message, [], [])]
                }))
                response.statusCode = 400
                response.end()
                return
            }
            GraphQL.graphql({
                schema: graphQlSchema,
                source: inputData.query,
                rootValue: getGraphQlTestStruct(),
                operationName: inputData.operationName,
                variableValues: inputData.variables
            }).then((resolvedData) => {
                response.write(JSON.stringify(resolvedData))
                response.statusCode = 200
                response.end()
            })
        })
    }
}

interface GraphQlRequest {
    query: string,
    operationName?: string,
    variables?: SimpleMap<string>
}

interface SimpleMap<V> {
    [key: string]: V
}

interface LineColumn {
    line: number,
    coloumn: number
}

function buildGraphQlError(message: string, locations: LineColumn[], path: StringOrNumber[]) {
    return {
        message: message,
        locations: locations,
        path: path
    }
}

function handleRequestData(data: string, contentType: string): GraphQlRequest {
    if(!contentType) {
        throw new Error("Content type has to be set or the request has " +
            "to be a GET request with the query parameter")
    } else if(contentType === "application/json") {
        const parsed = JSON.parse(data)
        if(!parsed.query) {
            throw new Error("Missing query field in post body")
        }
        return {
            query: parsed.query,
            operationName: parsed.operationName,
            variables: parsed.variables
        }
    } else if(contentType === "application/graphql" ||
        contentType.toUpperCase() === "GET") {
        return {
            query: data
        }
    } else {
        throw new Error(`Invlid content type ${contentType}`)
    }
    
}

type StringOrNumber = string | number