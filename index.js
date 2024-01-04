const { id } = require("@instantdb/admin");

const config = {
  apiURI: "http://localhost:8888",
  adminToken: process.env.ADMIN_TOKEN,
  appId: process.env.APP_ID,
};

const schema = {
  r: {
    keys: ["name", "desc", "args"]
  },
  ri: {
    links: [{
      ref: "r",
      forward: "inst",
      reverse: "_inst",
    }]
  },
  li: {
    keys: ["type", "order", "RIinit", "RIinitValue"],
    links: [{
      ref: "li",
      forward: "parent",
      reverse: "children",
    },
    {
      ref: "ri",
      forward: "li_value_ri",
      reverse: "_li_value_ri"
    },
    {
      ref: "v",
      forward: "li_value_v",
      reverse: "_li_value_v"
    }]
  },
  ai: {
    keys: ["argName", "type", "RIinit", "RIinitValue"],
    links: [
      {
        ref: "ri",
        forward: "parent",
        reverse: "children",
      },
      {
        ref: "ri",
        forward: "ai_value_ri",
        reverse: "_ai_value_ri"
      },
      { ref: "v", forward: "ai_value_v", reverse: "_ai_value_v" },
      { ref: "li", forward: "ai_value_li", reverse: "_ai_value_li" },
    ]
  },
  v: {
    keys: ["type", "order", "content"],
    links: [
      {
        ref: "v",
        forward: "parent",
        reverse: "children",
      },
      {
        ref: "v",
        forward: "root",
        reverse: "descendants"

      }
    ]
  },
  eb: {
    keys: ["ebtype", "content", "isToggle"],
    links: [
      { ref: "eb", forward: "self", reverse: "_self" },
      { ref: "eb", forward: "parent", reverse: "child" },
      { ref: "eb", forward: "next", reverse: "prev" },
      { ref: "eb", forward: "ac", reverse: "_ac" },
      { ref: "ai", forward: "ai", reverse: "eb" },
      { ref: "v", forward: "v", reverse: "eb" },
      { ref: "ri", forward: "ri", reverse: "eb" },
    ]
  }
}


function createObjectAttr(fwdIdent) {
  return {
    id: id(),
    "forward-identity": [id(), ...fwdIdent],
    "value-type": "blob",
    cardinality: "one",
    "unique?": false,
    "index?": false,
  };
}
function createRefAttr(fwdIdent, revIdent) {
  return {
    id: id(),
    "forward-identity": [id(), ...fwdIdent],
    "reverse-identity": [id(), ...revIdent],
    "value-type": "ref",
    cardinality: "many",
    "unique?": false,
    "index?": false,
  };
}

const attrsToAdd = Object.entries(schema).flatMap(([etype, { keys, links }]) => {
  const objectAttrs = (keys || []).map((key) => createObjectAttr([etype, key]));
  const refAttrs = (links || []).map(({ ref, forward, reverse }) => {
    return createRefAttr([etype, forward], [ref, reverse])
  });
  return [...objectAttrs, ...refAttrs];
});

const txSteps = attrsToAdd.map((attr) => {
  return ["add-attr", attr];
});


// ------- 
// In-progress transact api 

function authorizedHeaders(config) {
  const { adminToken, appId } = config;
  return {
    "content-type": "application/json",
    "authorization": `Bearer ${adminToken}`,
    "app-id": appId
  }
}

async function transactHack(txSteps) {
  const res = await fetch(`${config.apiURI}/admin/transact`, {
    method: "POST",
    headers: authorizedHeaders(config),
    body: JSON.stringify({ 'steps': txSteps }),
  });
  return await res.json();
}

console.log(authorizedHeaders(config));
async function doWork() {
  try {
    const res = await transactHack(txSteps);
    console.log(res);
  } catch (err) {
    console.log('Uh oh', err);
  }
}

doWork();
