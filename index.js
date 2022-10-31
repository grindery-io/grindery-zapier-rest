const express = require("express");
const port = 3000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const NexusClient = require("grindery-nexus-client").default;

const uri = `mongodb+srv://${process.env.mongo_user}:${process.env.mongo_password}@cluster0.5d0qb9x.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.get("/", function (req, res) {
  res.send("Endpoint Is up and Running");
});

app.listen(process.env.PORT || port, () => {
  console.log(`Listening on port ${port}`);
});

app.post("/token_test", async (req, res) => {
  console.log("Request Headers: ", req.headers);
  let authorization = req.headers["authorization"];
  let access_token = "";
  if (authorization.startsWith("Bearer ")) {
    access_token = authorization.substring(7, authorization.length);
    console.log("Access Token: ", access_token);
  } else {
    res.status(400).json({ error: "No Bearer Token Found" });
  }
  res.status(200).json({ message: "success" });
});

app.post("/webhooks", async (req, res) => {
  const hook_url = req.body.url;
  const hook_token = req.body.token;
  const workflow_id = req.body.workflow_id;
  const workspace_key = req.body.workspace_key;
  const nexus_client = new NexusClient();

  //Get the request headers
  let authorization = req.headers["authorization"];
  let access_token = "";
  //Get access token if exists
  if (authorization.startsWith("Bearer ")) {
    access_token = authorization.substring(7, authorization.length);
    console.log("Access Token: ", access_token);
    try {
      console.log("Attempting to authenticate client");
      nexus_client.authenticate(access_token);
      console.log("Workspace Key: ", workspace_key);
      //next, find the selected workflow
      const workflows = await nexus_client.listWorkflows(workspace_key);
      console.log("Client Token: ", nexus_client.getToken());
      const thisSelectedWorkspace = workflows.filter(
        (workspace) => workspace.key === workspace_key
      );
      console.log(
        "List of Workspaces: ",
        JSON.stringify(thisSelectedWorkspace)
      );
    } catch (error) {
      res.status(400).json({
        error: `${error.message} - Error Authenticating Nexus Client`,
      });
    }
  } else {
    //end with error if not exists
    res.status(400).json({ error: "No Bearer Token Found" });
  }
  //res.status(200).json({ message: "success" });

  //list the workflows, filter workflows to get the workflow
  /*const workflows = await nexus_client.listWorkflows();

  const updateWorkflow = async () => {
    const workflows = await nexus_client.updateWorkflow(workflow_key, )
  };*/

  /*client.connect(async (err) => {
    const collection = client.db("grindery_zapier").collection("webhooks");
    // perform actions on the collection object
    console.log("Request Body", JSON.stringify(req.body)); //DEBUG: Logging

    const new_webhook = {
      timestamp: Date.now(),
      token: hook_token,
      webhook_url: hook_url,
      workflow_id: workflow_id,
      workspace_key: workspace_key,
    };
    const insert_result = await collection.insertOne(new_webhook);
    console.log(
      `A document was inserted with the _id: ${insert_result.insertedId}`
    );
    client.close();
    res.status(200).json({ id: insert_result.insertedId });
  });*/
});

app.delete("/webhooks/:webhook_id", async (req, res) => {
  const { webhook_id } = req.params;
  console.log("Webhook ID: ", webhook_id);

  client.connect(async (err) => {
    //client.db("grindery_zapier").collection("webbooks");
    const collection = client.db("grindery_zapier").collection("webhooks");
    const insert_result = await collection.deleteOne({
      _id: new ObjectId(webhook_id),
    });
    console.log(`A document was deleted with the _id: ${webhook_id}`);
    client.close();
    res.status(200).json({ result: "removed" });
  });
});

app.post("/getData", async (req, res) => {
  client.connect(async (err) => {
    const collection = client.db("grindery_zapier").collection("sample_data");
    const search_result = await collection.findOne({ token: token });
  });
});

app.post("/triggerZap", async (req, res) => {
  const token = req.body.token;
  const payload = req.body.payload;
  client.connect(async (err) => {
    const collection = client.db("grindery_zapier").collection("webhooks");
    // perform actions on the collection object
    const search_result = await collection.findOne({ token: token });
    //res.status(200).send({ data: "ok" });
    if (search_result) {
      const forward_to_zap = await axios.post(search_result.webhook_url, {
        payload,
      });

      res.status(200).json({ message: forward_to_zap.status });
    } else {
      res.status(200).json({ err: "Zap not found" });
    }
    //res.status(200).json({ message: search_result.webhook_url });
    client.close();
  });
});

module.exports = app;
