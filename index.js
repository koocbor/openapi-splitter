import fs from 'fs';
import path from 'path';
import { rimrafSync } from 'rimraf';
import YAML from 'yaml';

const outDir = '/Users/robcook/TeamBuildr/github/node-server/server/api-v3';
// const outDir = 'server/api-v3';
const sourceFilePath = 'teambuildr.yml';

const pathsOutDirName = 'api-routes';

function createMainSpec(sourceObj) {
  const mainSpec = {};
  mainSpec.openapi = sourceObj.openapi;
  mainSpec.info = sourceObj.info;
  mainSpec.servers = sourceObj.servers;
  mainSpec.tags = sourceObj.tags;

  mainSpec.paths = { $ref: `${pathsOutDirName}/_index.yaml` };
  mainSpec.components = {};
  mainSpec.components.securitySchemes = sourceObj.components.securitySchemes;
  // mainSpec.components.parameters = { $ref: 'parameters/_index.yaml' };
  // mainSpec.components.requestBodies = { $ref: 'requests/_index.yaml' };
  mainSpec.components.responses = { $ref: 'responses.yaml' };
  mainSpec.components.schemas = { $ref: 'schemas.yaml' };
  mainSpec.security = [
    {},
    {
      OAuth: [
        'offline_access',
        'urn:teambuildr:me',
        'urn:teambuildr:coach',
        'urn:teambuildr:admin',
        'urn:teambuildr:tbAdminScope',
      ],
    },
  ];
  return mainSpec;
}

function createOutFolders() {
  const __dirname = import.meta.dirname;
  let outPath = path.resolve(__dirname, outDir);
  // rimrafSync(outPath);
  if (!fs.existsSync(outPath)) {
    fs.mkdirSync(outPath, { recursive: true });
  }

  const folders = [
    // 'parameters',
    pathsOutDirName,
    // 'requests',
    // 'responses',
    // 'schemas',
  ];

  folders.forEach((folder) => {
    outPath = path.resolve(__dirname, outDir, folder);
    if (!fs.existsSync(outPath)) {
      fs.mkdirSync(outPath);
    }
  });
}

function createParameters(sourceObj) {
  const __dirname = import.meta.dirname;
  const indexObj = {};

  fs.writeFileSync(
    path.resolve(__dirname, outDir, 'parameters', '_index.yaml'),
    YAML.stringify(indexObj),
    { encoding: 'utf8' },
  );
}

function createPaths(sourceObj) {
  const __dirname = import.meta.dirname;
  const indexObj = {};

  const pathObj = sourceObj.paths;
  Object.keys(pathObj)
    .sort()
    .forEach((pathKey) => {
      // const pathFileName = `${pathKey.replace('/', '').replaceAll('/', '.')}.yaml`;
      const pathFileName =
        pathKey.substring(pathKey.lastIndexOf('/') + 1) + '.yaml';

      const pathFilePath = pathKey
        .substring(0, pathKey.lastIndexOf('/'))
        .replace('/', '');

      const dirDepth = (pathKey.match(/\//g) || []).length;
      let relDirDepth = '';
      for (let i = 0; i < dirDepth; i++) {
        relDirDepth += '../';
      }
      const relPathPrefix = relDirDepth + 'schemas.yaml#/';
      const relResponsesPrefix = relDirDepth + 'responses.yaml#/';

      let pathJson = pathObj[pathKey];
      pathJson = replaceRefs(pathJson, relPathPrefix);
      pathJson = fixPath400ResponseRequest(pathJson, relResponsesPrefix);

      const indexPath =
        pathFilePath.length > 0
          ? pathFilePath + '/' + pathFileName
          : pathFileName;
      indexObj[pathKey] = {
        $ref: indexPath,
      };
      if (
        !fs.existsSync(
          path.resolve(__dirname, outDir, pathsOutDirName, pathFilePath),
        )
      ) {
        fs.mkdirSync(
          path.resolve(__dirname, outDir, pathsOutDirName, pathFilePath),
          {
            recursive: true,
          },
        );
      }

      fs.writeFileSync(
        path.resolve(
          __dirname,
          outDir,
          pathsOutDirName,
          pathFilePath,
          pathFileName,
        ),
        YAML.stringify(pathJson),
        { encoding: 'utf8' },
      );
    });

  fs.writeFileSync(
    path.resolve(__dirname, outDir, pathsOutDirName, '_index.yaml'),
    YAML.stringify(indexObj),
    { encoding: 'utf8' },
  );
}

function createRequests(sourceObj) {
  const __dirname = import.meta.dirname;
  const indexObj = {};

  fs.writeFileSync(
    path.resolve(__dirname, outDir, 'requests', '_index.yaml'),
    YAML.stringify(indexObj),
    { encoding: 'utf8' },
  );
}

function createResponses(sourceObj) {
  const __dirname = import.meta.dirname;
  const indexObj = {};

  /**
   * Add some default respones
   */
  const defaultResponses = [
    { name: '400Error', description: 'The request is invalid.' },
    {
      name: '401Unauthorized',
      description:
        'The request did not include the correct authorization or the included authorization has expired.',
    },
    {
      name: '403Forbidden',
      description:
        'The requested resource is not accessible to the currently authenticated client.',
    },
    {
      name: '404NotFound',
      description: 'The requested resource was not found.',
    },
  ];
  defaultResponses.forEach((rsp) => {
    const rspObj = { description: rsp.description };
    indexObj[rsp.name] = rspObj;
    //   indexObj[rsp.name] = { $ref: `${rsp.name}.yaml` };
    //   fs.writeFileSync(
    //     path.resolve(__dirname, outDir, 'responses', `${rsp.name}.yaml`),
    //     YAML.stringify(rspObj),
    //     { encoding: 'utf8' },
    //   );
  });

  fs.writeFileSync(
    // path.resolve(__dirname, outDir, 'responses', '_index.yaml'),
    path.resolve(__dirname, outDir, 'responses.yaml'),
    YAML.stringify(indexObj),
    { encoding: 'utf8' },
  );
}

function createSchemas(sourceObj) {
  const __dirname = import.meta.dirname;
  const indexObj = {};

  const schemaObj = sourceObj.components.schemas;
  Object.keys(schemaObj)
    .sort()
    .forEach((schemaKey) => {
      let schemaJson = schemaObj[schemaKey];
      schemaJson = replaceRefs(schemaJson, '#/');
      indexObj[schemaKey] = schemaJson;
    });
  // Object.keys(schemaObj)
  //   .sort()
  //   .forEach((schemaKey) => {
  //     const schemaFileName = `${schemaKey}.yaml`;
  //     let schemaJson = schemaObj[schemaKey];
  //     schemaJson = replaceRefs(schemaJson, '');
  //     indexObj[schemaKey] = { $ref: schemaFileName };

  //     fs.writeFileSync(
  //       path.resolve(__dirname, outDir, 'schemas', schemaFileName),
  //       YAML.stringify(schemaJson),
  //       { encoding: 'utf8' },
  //     );
  //   });

  fs.writeFileSync(
    // path.resolve(__dirname, outDir, 'schemas', '_index.yaml'),
    path.resolve(__dirname, outDir, 'schemas.yaml'),
    YAML.stringify(indexObj),
    { encoding: 'utf8' },
  );
}

/**
 * OpenAPI requires each endpoint to have at least one 4xx response.
 *
 * @param {*} pathJson
 * @returns
 */
function fixPath400ResponseRequest(pathJson, relPrefix) {
  const restVerbs = ['delete', 'get', 'patch', 'post', 'put'];

  Object.keys(pathJson).forEach((key) => {
    if (restVerbs.includes(key)) {
      const endpoint = pathJson[key];
      const includeAuthErrors = endpoint.security !== undefined;
      const responseKeys = Object.keys(endpoint.responses);
      if (
        (key === 'patch' || key === 'post' || key === 'put') &&
        !responseKeys.includes('400')
      ) {
        endpoint.responses['400'] = { $ref: `${relPrefix}400Error` };
      }
      if (includeAuthErrors) {
        if (!responseKeys.includes('401')) {
          endpoint.responses['401'] = {
            $ref: `${relPrefix}401Unauthorized`,
          };
        }
        if (!responseKeys.includes('403')) {
          endpoint.responses['403'] = {
            $ref: `${relPrefix}403Forbidden`,
          };
        }
      }
      if (!responseKeys.includes['404']) {
        endpoint.responses['404'] = { $ref: `${relPrefix}404NotFound` };
      }

      pathJson[key] = endpoint;
    }
  });

  return pathJson;
}

function fixTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => {
      if (!tag.description) {
        tag.description = `Endpoints and components related to ${tag.name}.`;
      }
      return tag;
    });
  }
  return tags;
}

function loadSource(sourceFilePath) {
  const file = fs.readFileSync(sourceFilePath, 'utf8');
  const ymlObj = YAML.parse(file);
  return ymlObj;
}

function replaceRefs(obj, relPathPrefix) {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        obj[key] = replaceRefs(obj[key], relPathPrefix);
      } else {
        if (key === '$ref') {
          let value = obj[key];

          if (value.indexOf('#/components/schemas/') >= 0) {
            value = value.replace('#/components/schemas/', relPathPrefix);
          } else if (value && value.indexOf('/') >= 0) {
            value = value.substring(value.lastIndexOf('/') + 1);
          }
          obj[key] = value;
        }
      }
    }
  }
  return obj;
}

function saveOutput(mainSpec) {
  const __dirname = import.meta.dirname;
  const mainOut = path.resolve(__dirname, outDir, 'teambuildr-api-source.yml');
  const ymlOut = YAML.stringify(mainSpec);
  fs.writeFileSync(mainOut, ymlOut, { encoding: 'utf8' });
}

async function main() {
  createOutFolders();

  const sourceObj = loadSource(sourceFilePath);

  const mainSpec = createMainSpec(sourceObj);
  mainSpec.tags = fixTags(mainSpec.tags);

  // createParameters(sourceObj);
  createPaths(sourceObj);
  // createRequests(sourceObj);
  createResponses(sourceObj);
  createSchemas(sourceObj);

  saveOutput(mainSpec);
}

await main();
