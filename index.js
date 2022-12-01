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

function uniqueID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4();
}

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

app.post("/performList", async (req, res) =>{
  let trigger_key = req.body.trigger_id
  console.log("Req: ", req.body);
  let object = {};
  switch(trigger_key){
    case "evmWallet":
      object = {
        blockHash: "0x1d59ff54b1eb26b013ce3cb5fc9dab3705b415a67127a003c3e61eb445bb8df2",
        blockNumber: "0x5daf3b",
        from: "0xa7d9ddbe1f17865597fbd27ec712455208b6b76d",
        hash: "0x88df016429689c079f3b2f6ad39fa052532c56795b733da78a91ebe6a713944b",
        to: "0xf02c1c8e6114b1dbe8937a39260b5b0a374432bb",
        value: "0xf3dbb76162000"
      };
  }
  let array = [];
  array.push(object);
  res.status(200).json({items: array});
})

app.post("/latest_data", async (req, res) => {
  const token = req.body.token;
  if (token) {
    console.log("this token: ", token);
    const data_transmissions = client
      .db("grindery_zapier")
      .collection("latest_data");
    const search_result = await data_transmissions.findOne({
      token: token,
    });
    if (search_result) {
      const data_found = JSON.parse(search_result.data);
      const itemArray = [];
      itemArray.push({ id: Date.now(), data: data_found });
      console.log("Data Found: ", data_found);
      console.log("Found Latest Data for Token: ", token);
      res.status(200).json({
        items: itemArray,
      });
    } else {
      res.status(200).json({ items: [] });
    }
  } else {
    res.status(400).json({ error: "No Data" });
  }
});

app.post("/uniqueID", async (req, res) => {
  console.log("Incoming request: ", req.body);
  let id = 1;
  //generate token
  let unique_id = uniqueID();
  try {
    if (req.body.params.key === "triggerZap") {
      //send response
      res.status(200).send(
        JSON.stringify({
          jsonrpc: "2.0",
          result: {
            inputFields: [
              {
                key: "token",
                label: "Token",
                type: "string",
                default: unique_id,
                readonly: true,
                helpText: "Workflow Unique ID",
                required: true,
              },
              {
                key: "data",
                label: "Data to Send",
                type: "string",
                placeholder: '{"key":"value"}',
                list: false,
                required: false,
              },
            ],
            outputFields: [],
          },
          id: id,
        })
      );
    } else {
      //send response
      res.status(200).send(
        JSON.stringify({
          jsonrpc: "2.0",
          result: {
            inputFields: [
              {
                key: "token",
                label: "Token",
                type: "string",
                default: unique_id,
                readonly: true,
                helpText: "Workflow Unique ID",
                required: true,
              },
            ],
            outputFields: [],
          },
          id: id,
        })
      );
    }
  } catch (error) {}
});

app.get("/me", async (req, res) => {
  const nexus_client = new NexusClient();
  console.log("Request Headers: ", req.headers);
  let authorization = req.headers["authorization"];
  let access_token = "";
  if (authorization.startsWith("Bearer ")) {
    access_token = authorization.substring(7, authorization.length);
    let id = access_token.substring(18, access_token);
    res.status(200).json({ id: id });
    /*console.log("Access Token: ", access_token);
    nexus_client.authenticate(access_token);
    const workspaces = await nexus_client.listWorkspaces();
    if (workspaces.length >= 1) {
      const first_workspace = workspaces[0];
      let creator = first_workspace.creator;
      let wallet_address = creator.substring(11, creator.length);
      res.status(200).json({ id: wallet_address });
    } else {
      res
        .status(400)
        .json({ message: "Create at least 1 workspace on Grindery" });
    }*/
  } else {
    res.status(400).json({ error: "No Bearer Token Found" });
  }
});

app.post("/webhooks", async (req, res) => {
  const hook_url = req.body.url;
  const hook_token = req.body.token;
  //const workflow_id = req.body.workflow_id;
  //console.log("Workflow ID: ", workflow_id);
  const workspace_key = req.body.workspace_key;
  const nexus_client = new NexusClient();

  //Get the request headers
  /*let authorization = req.headers["authorization"];
  let access_token = "";
  //Get access token if exists
  if (authorization.startsWith("Bearer ")) {
    access_token = authorization.substring(7, authorization.length);
    console.log("Access Toke : ", access_token);
    try {
      nexus_client.authenticate(access_token);
      const workspaces = await nexus_client.listWorkspaces();
      //next, find the selected workflow
      //const workflows = await nexus_client.listWorkflows(workspace_key);
      console.log("Workflows: ", JSON.stringify(workspaces));
      const thisSelectedWorkflow = workflows.filter(
        (workspace) => workspace._id === workflow_id
      );
      console.log("Selected Workflow: ", JSON.stringify(thisSelectedWorkflow));
    } catch (error) {
      res.status(400).json({
        error: `${error.message} - Error Authenticating Nexus Client`,
      });
    }
  } else {
    //end with error if not exists
    res.status(400).json({ error: "No Bearer Token Found" });
  }*/
  //res.status(200).json({ message: "success" });

  //list the workflows, filter workflows to get the workflow
  /*const workflows = await nexus_client.listWorkflows();

  const updateWorkflow = async () => {
    const workflows = await nexus_client.updateWorkflow(workflow_key, )
  };*/

  client.connect(async (err) => {
    const collection = client.db("grindery_zapier").collection("webhooks");
    // perform actions on the collection object
    console.log("Request Body", JSON.stringify(req.body)); //DEBUG: Logging

    /*const new_webhook = {
      timestamp: Date.now(),
      token: hook_token,
      webhook_url: hook_url,
      //workflow_id: workflow_id,
      workspace_key: workspace_key,
    };
    const insert_result = await collection.insertOne(new_webhook);*/
    const hook_id = Date.now();
    const new_webhook = {
      $set: {
        hook_id: hook_id.toString(),
        webhook_url: hook_url,
        token: hook_token,
        workspace_key: workspace_key,
      },
    };
    const insert_new_webhook_result = await collection.updateOne(
      { token: hook_token },
      new_webhook,
      { upsert: true }
    );
    console.log("Insert Result Object", insert_new_webhook_result);
    console.log(`A webhook was inserted with the id: ${hook_id}`);
    client.close();
    res.status(200).json({
      id: hook_id,
    });
  });
});

app.delete("/webhooks/:webhook_id", async (req, res) => {
  const { webhook_id } = req.params;
  console.log("Webhook ID: ", webhook_id);

  client.connect(async (err) => {
    //client.db("grindery_zapier").collection("webbooks");
    const collection = client.db("grindery_zapier").collection("webhooks");
    const search_result = await collection.findOne({ hook_id: webhook_id });
    console.log("Search Result", search_result);
    if (search_result) {
      const delete_result = await collection.deleteOne({
        _id: search_result._id,
      });
      console.log(`A document was deleted with the _id: ${webhook_id}`);
      res.status(200).json({ result: "removed" });
      client.close();
    } else {
      console.log(`A webhook with the hook_id: ${webhook_id} not found in `);
      res.status(400).json({ error: "webhook not found" });
      client.close();
    }
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
