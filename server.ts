const cds = require("@sap/cds");
const cors = require("cors");
const bodyParser = require("body-parser");

cds.on("bootstrap", (app: any) => {
  app.use(cors());
  app.use(bodyParser.json({ limit: "500mb" }));
  app.use(bodyParser.raw({ limit: "500mb" }));
  app.use(bodyParser.urlencoded({ extended: true, limit: "500mb" }));

  app.get("/api/hello", (req: any, res: any) => {
    res.json({ message: "Hello from the CDS server!" });
  });
});

module.exports = cds.server;
