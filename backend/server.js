import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ExpressRedisCache from "express-redis-cache";
import { getProject, changeProjectLocation, getMaterial } from "./api.js";
dotenv.config();

const app = express();
const port = +process.env.EXPRESS_PORT;

async function updateLocation(req, res) {
  const qs = req.originalUrl.substring(1).split("?")[1];
  const data = await changeProjectLocation(qs);
  res.json(data);
}

async function returnProject(req, res) {
  const data = await getProject();
  res.json(data);
}

async function returnMaterials(req, res) {
  const qs = req.originalUrl.substring(1).split("?")[1];
  const keyValuePairs = qs.split("&");
  const dictionary = keyValuePairs
    .map((d) => {
      const key = d.split("=")[0];
      let value = d.split("=")[1];
      value = decodeURIComponent(value).replace(/\+/g, " ");
      if (key === "materials") {
        value =
          value.split(",").length > 1
            ? value.split(",").map((v) => v.toLowerCase())
            : [value.toLowerCase()];
      }
      return { [key]: value };
    })
    .reduce((acc, current) => ({ ...acc, ...current }), {});
  // NOTE: Set location if new one is provided in querystring and does not match current location
  // query string *should* contain a location, otherwise caching will not properly reflect location
  let project = await getProject();
  // Check address and update if needed (rough substring match used)
  const lowercaseAddress = project.address.toString().toLowerCase();
  if (lowercaseAddress.indexOf(dictionary["location"]) === -1) {
    project = await changeProjectLocation(dictionary["location"]);
  }
  const distance = dictionary["distance"];
  const asyncFunctions = dictionary["materials"].map((d) =>
    getMaterial(d, distance)
  );
  const result = await Promise.all(asyncFunctions);
  const resultObj = result.reduce((acc, curr) => ({ ...acc, ...curr }), {});
  res.json(resultObj);
}

// const cache = ExpressRedisCache({
//   host: process.env.CACHE_HOST,
//   port: +process.env.CACHE_PORT,
// });

app.use(cors());

// app.get("/project/", cache.route(), returnProject);

// app.get("/location/", cache.route(), updateLocation);

// app.get("/material/", cache.route(), returnMaterials);

app.get("/project/", returnProject);

app.get("/location/", updateLocation);

app.get("/material/", returnMaterials);

app.listen(port, () => {
  console.log(`Express app listening at http://localhost:${port}`);
});
