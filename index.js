const express = require("express");
const port = 3000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const NexusClient = require("grindery-nexus-client").default;

const uri = process.env.MONGO_URL;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function toCamelCase(str) {
  return str
    .split(" ")
    .map(function (word, index) {
      // If it is the first word make sure to lowercase all the chars.
      if (index == 0) {
        return word.toLowerCase();
      }
      // If it is not the first word only upper case the first char and lowercase the rest.
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
}

//token generation
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

//return CDS sample when testing a trigger
app.post("/performList", async (req, res) => {
  let trigger_key = req.body.trigger_id;
  let trigger_item = req.body.trigger_item;
  const nexus_client = new NexusClient();
  const nexus_response = await nexus_client.getDriver(trigger_key);
  let object = {};
  if (nexus_response) {
    let selected_trigger_method = nexus_response.triggers.filter(
      (trigger) => trigger.key === trigger_item
    );
    if (selected_trigger_method.length >= 1) {
      object = selected_trigger_method[0].operation.sample;
      let renamed_object = {};

      //iterate through the outputFields, find the corresponding key, assign the new key and its value
      selected_trigger_method[0].operation.outputFields.map((field) => {
        renamed_object = {
          [field.label]: object[field.key],
          ...renamed_object,
        };
      });
      res.status(200).json({ items: [renamed_object] });
    } else {
      res.status(200).json({ items: [] });
    }
  } else {
    res.status(200).json({ items: [] });
  }
});

//legacy sample route - remove
app.post("/latest_data", async (req, res) => {
  const token = req.body.token;
  if (token) {
    const data_transmissions = client.db("zapier").collection("latest_data");
    const search_result = await data_transmissions.findOne({
      token: token,
    });
    if (search_result) {
      const data_found = JSON.parse(search_result.data);
      const itemArray = [];
      itemArray.push({ id: Date.now(), data: data_found });
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

//save workflow to allow for removal when zap disabled
app.post("/saveWorkflow", async (req, res) => {
  const id = req.body.id;
  const workflow = req.body.workflow;

  if (id) {
    console.log("this token: ", id);
    client.connect(async (err) => {
      const workflow_collection = client
        .db("zapier")
        .collection("saved_workflows");

      const new_workflow = {
        $set: {
          id: id.toString(),
          workflow: workflow,
        },
      };
      const insert_new_workflow_result = await workflow_collection.updateOne(
        { id: id },
        new_workflow,
        { upsert: true }
      );
      console.log("Insert Response: ", insert_new_workflow_result);
      res.status(200).json({
        id: id,
      });

      client.close();
    });
  } else {
    res
      .status(400)
      .json({ error: "Webhook ID required for saving workflow data" });
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

//legacy route for testing auth in zap - and labelling connection
app.get("/me", async (req, res) => {
  const nexus_client = new NexusClient();
  console.log("Request Headers: ", req.headers);
  let authorization = req.headers["authorization"];
  let access_token = "";
  if (authorization.startsWith("Bearer ")) {
    access_token = authorization.substring(7, authorization.length);

    // authenticate client
    nexus_client.authenticate(access_token);

    // get workflows to check if token is valid
    let workflows;
    try {
      workflows = await nexus_client.listWorkflows();
    } catch (error) {
      res.status(401).json({ error: "Invalid access token" });
    }

    // get user info
    const user = nexus_client.getUser();
    if (user) {
      // return user's wallet address is short format, e.g. 0x44Ab...f5c0
      res.status(200).json({ id: user.address_short });
    } else {
      res.status(400).json({ error: "User not authenticated" });
    }

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

//required for the subscribe function when turning a zap on
app.post("/webhooks", async (req, res) => {
  const hook_url = req.body.url;
  const hook_token = req.body.token;
  const workspace_key = req.body.workspace_key;
  const nexus_client = new NexusClient();

  client.connect(async (err) => {
    const collection = client.db("zapier").collection("webhooks");
    // perform actions on the collection object
    console.log("Request Body", JSON.stringify(req.body)); //DEBUG: Logging
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
      id: hook_id, //this identifies which zap id is in mongo
    });
  });
});

app.delete("/webhooks/:webhook_id/:workflow_key", async (req, res) => {
  const { webhook_id } = req.params;
  const { workflow_key } = req.params;
  console.log("Webhook ID: ", webhook_id);
  console.log("Workflow Key: ", workflow_key);

  client.connect(async (err) => {
    const collection = client.db("zapier").collection("webhooks");
    const saved_workflows = client.db("zapier").collection("saved_workflows");

    const search_result = await collection.findOne({ hook_id: webhook_id });
    const search_result_workflow = await saved_workflows.findOne({
      id: webhook_id,
    });

    console.log("Search Result", search_result);
    console.log("Search Result Workflow", search_result_workflow);

    //try to delete the grindery workflow
    if (search_result_workflow) {
      try {
        //get the workflw object and set status to off
        let workflow = search_result_workflow.workflow;
        workflow.state = "off";
        //get the authorization from headers
        let authorization = req.headers["authorization"];
        let access_token = "";
        if (authorization.startsWith("Bearer ")) {
          access_token = authorization.substring(7, authorization.length);

          const nexus_client = new NexusClient();
          nexus_client.authenticate(access_token);
          //const response_from_disabling = await nexus_client.updateWorkflow(workflow_key, workflow);
          const delete_workflow_response = await nexus_client.deleteWorkflow(
            workflow_key
          );
          console.log(delete_workflow_response);
          console.log(
            "Response from disabling workflow: ",
            response_from_disabling
          );
          const delete_result = await saved_workflows.deleteOne({
            _id: search_result_workflow._id,
          });
          console.log(
            "Deleted data from collection successfully: ",
            delete_result
          );
        }
      } catch (error) {
        if (error.message === "Invalid access token") {
          console.log(
            "Auth Error disabling workflow, supplied access token has expired"
          );
        } else {
          console.log("Error disabling workflow: ", error.message);
        }
      }
    }

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
    const collection = client.db("zapier").collection("sample_data");
    const search_result = await collection.findOne({ token: token });
  });
});

app.post("/triggerZap", async (req, res) => {
  const token = req.body.token;
  const payload = req.body.payload;
  client.connect(async (err) => {
    const collection = client.db("zapier").collection("webhooks");
    // perform actions on the collection object
    const search_result = await collection.findOne({ token: token });
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
