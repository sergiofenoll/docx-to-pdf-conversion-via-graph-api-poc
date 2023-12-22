import { app, query, update, errorHandler, sparqlEscapeString } from 'mu';
import fs from 'fs';
import { StreamUpload, LargeFileUploadTask } from "@microsoft/microsoft-graph-client";
import { USER_ID, MS_GRAPH_CLIENT as client } from './config';

const parseSparqlResults = (data) => {
  if (!data) return;
  const vars = data.head.vars;
  return data.results.bindings.map((binding) => {
    const obj = {};
    vars.forEach((varKey) => {
      if (binding[varKey]) {
        obj[varKey] = binding[varKey].value;
      }
    });
    return obj;
  });
};

const getFileById = async function (fileId) {
  const q = `
PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
PREFIX dbpedia: <http://dbpedia.org/ontology/>
PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
SELECT DISTINCT (?virtualFile AS ?uri) (?physicalFile AS ?physicalUri) (?uuid as ?id) ?name ?extension
WHERE {
    ?virtualFile a nfo:FileDataObject ;
        mu:uuid ${sparqlEscapeString(fileId)} ;
        mu:uuid ?uuid .
    ?physicalFile a nfo:FileDataObject ;
        nie:dataSource ?virtualFile .
    ?virtualFile nfo:fileName ?name .
    ?virtualFile dbpedia:fileExtension ?extension .
}
  `;
  const result = await query(q);
  const [file] = parseSparqlResults(result);
  return file;
};


app.get('/', function(_req, res) {
  res.send('Hello mu-javascript-template');
});

app.post('/files/:id/convert', async (req, res) => {
  // const upn = await client
  //       .api("/users")
  //       .filter(`mail eq 'sergio.fenoll@6r3p7j.onmicrosoft.com'`)
  //       .select("userPrincipalName")
  //       .get();
  // console.debug(upn)

  const drives = await client
        .api(`/users/${USER_ID}/drives`)
        .get();
  console.debug(drives);
  const fileId = req.params.id;
  const file = await getFileById(fileId);
  file.path = file.physicalUri.replace('share://', '/share/');

  // const options = {
  //   // Relative path from root to destination folder
  //   path: './',
  //   // file is a File object, typically from an <input type="file"/>
  //   fileName: file.name,
  //   rangeSize: 1024 * 1024,
  //   uploadEventHandlers: {
  //     // Called as each "slice" of the file is uploaded
  //     progress: (range, e) => {
  //       console.log(`Uploaded ${range?.minValue} to ${range?.maxValue}`);
  //     }
  //   }
  // };

  // try {
  //   const stats = fs.statSync(file.path);
  //   const totalSize = stats.size;
  //   const readStream = fs.createReadStream(file.path);
  //   const fileObject = new StreamUpload(readStream, file.name, totalSize);
  //   // Create a OneDrive upload task
  //   const uploadTask = await OneDriveLargeFileUploadTask
  //     .createTaskWithFileObject(client, fileObject, options);

  //   // Do the upload
  //   const uploadResult = await uploadTask.upload();

  //   // The response body will be of the corresponding type of the
  //   // item being uploaded. For OneDrive, this is a DriveItem
  //   const driveItem = uploadResult.responseBody;
  //   console.log(`Uploaded file with ID: ${driveItem.id}`);
  //   console.debug(driveItem);
  try {
    const uploadSessionPayload = {
      item: {
        '@microsoft.graph.conflictBehavior': 'rename',
      },
    }
    const uploadSession = await LargeFileUploadTask.createUploadSession(
      client,
      `/users/${USER_ID}/drive/root:/${file.id}.${file.extension}:/createUploadSession`,
      uploadSessionPayload,
    );
    const stats = fs.statSync(file.path);
    const fileSize = stats.size;
    const readStream = fs.createReadStream(file.path);
    const fileObject = new StreamUpload(readStream, file.name, fileSize);
    const options = {
      rangeSize: 327680,
      uploadEventHandlers: {
        progress: (range) => { console.info(`Progress uploading file <${file.uri}>. Bytes: [${range.minValue}, ${range.maxValue}]`) }
      },
    };
    const uploadTask = new LargeFileUploadTask(client, fileObject, uploadSession, options);
    const result = await uploadTask.upload();
    console.debug(result);
  } catch (err) {
    console.log(`Error uploading file: ${JSON.stringify(err)}`);
    console.debug(err);
  }

  const downloadStream = await client
        .api(`/users/${USER_ID}/drive/root:/${file.id}.${file.extension}:/content?format=pdf`)
        .get();
  const writeStream = fs.createWriteStream('/share/out.pdf');
  downloadStream.pipe(writeStream);
});

app.use(errorHandler);
