import solace from "solclientjs";
import { readCredentialValue } from "../credentialStore/credentialStore.js";

const AEM_CREDSTORE_NAMESPACE =
  process.env.AEM_CREDSTORE_NAMESPACE ?? "Collabsphere";

// Every AEM setting is stored in the SAP Credential Store as a "key" credential
// in the AEM_CREDSTORE_NAMESPACE namespace, so it is read from the /key path.
async function readAemKey(name: string): Promise<string> {
  return readCredentialValue(name, AEM_CREDSTORE_NAMESPACE, "key");
}

async function aemCreateSession() {
  // All AEM credentials come from the SAP Credential Store; a failed read stops
  // startup (no env-var fallback).
  const [host, vpn, username, password, queue] = await Promise.all([
    readAemKey("AEM_HOST"),
    readAemKey("AEM_VPN"),
    readAemKey("AEM_USERNAME"),
    readAemKey("AEM_PASSWORD"),
    readAemKey("AEM_QUEUE"),
  ]);

  try {
    // Validate credentials
    if (!host || !vpn || !username || !password || !queue) {
      throw new Error(
        "Missing required AEM credentials in the Credential Store namespace " +
          `"${AEM_CREDSTORE_NAMESPACE}".`,
      );
    }

    // Solace-compatible logger
    const logger = new solace.LogImpl(
      console.trace.bind(console),
      console.debug.bind(console),
      console.info.bind(console),
      console.warn.bind(console),
      console.error.bind(console),
      console.error.bind(console),
    );

    // Initialize Solace JavaScript API
    solace.SolclientFactory.init({
      profile: solace.SolclientFactoryProfiles.version10,
      logLevel: solace.LogLevel.INFO,
      logger: logger,
    });

    console.log("Solace SDK initialized.");

    // Create Solace session
    const session = solace.SolclientFactory.createSession({
      url: host,
      vpnName: vpn,
      userName: username,
      password: password,
    });

    console.log("Solace session created.");

    // Successful connection
    session.on(solace.SessionEventCode.UP_NOTICE, () => {
      console.log("Successfully connected to AEM!");

      const queueDescriptor = new solace.QueueDescriptor({
        name: queue,
        type: solace.QueueType.QUEUE,
      });

      console.log(`Queue descriptor created: ${queue}`);

      // Create message consumer bound to the queue
      const messageConsumer = session.createMessageConsumer({
        queueDescriptor: queueDescriptor,
        acknowledgeMode: solace.MessageConsumerAcknowledgeMode.CLIENT,
      });

      console.log("Message consumer created.");

      // Queue connected successfully
      messageConsumer.on(solace.MessageConsumerEventName.UP, () => {
        console.log(`Successfully connected to queue: ${queue}`);
      });

      // Queue connection failed
      messageConsumer.on(
        solace.MessageConsumerEventName.DOWN_ERROR,
        (error) => {
          console.error("Queue connection failed:", error);
        },
      );

      // This consumer became the single active flow on the (Exclusive) queue
      messageConsumer.on(solace.MessageConsumerEventName.ACTIVE, () => {
        console.log(`Consumer is ACTIVE on queue: ${queue}`);
      });

      // Another bound consumer took over as the active flow; this one is idle
      messageConsumer.on(solace.MessageConsumerEventName.INACTIVE, () => {
        console.log(`Consumer is INACTIVE on queue: ${queue}`);
      });

      // Message received
      messageConsumer.on(solace.MessageConsumerEventName.MESSAGE, (message) => {
        const payload = message.getBinaryAttachment()?.toString();
        console.log("Message received:", payload);
        message.acknowledge();
      });

      // Connect consumer to queue
      console.log(`Connecting to queue: ${queue}`);

      messageConsumer.connect();
    });

    // Connection failure
    session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (error) => {
      console.error("Failed to connect to AEM:", error);
    });

    // Disconnection
    session.on(solace.SessionEventCode.DISCONNECTED, () => {
      console.log("Disconnected from AEM.");
    });

    // Connect to AEM
    console.log("Connecting to AEM...");
    session.connect();
  } catch (error: any) {
    console.error("Error connecting to AEM messaging service:", error.message);
  }
}

export { aemCreateSession };
