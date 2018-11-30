import * as GraphQL from "graphql"
import * as FS from "fs"

export let graphQlSchema: GraphQL.GraphQLSchema

function reloader() {
    graphQlSchema = GraphQL.buildSchema(FS.readFileSync("schema.gql").toString())
    FS.watchFile("schema.gql", () => {
        try {
            graphQlSchema = GraphQL.buildSchema(FS.readFileSync("schema.gql").toString())
        } catch(e) {
            if(e.message) {
                e = e.message
            }
            console.error("Failed to reload GraphQL schema: %s", e)
        }
    })
}

reloader()