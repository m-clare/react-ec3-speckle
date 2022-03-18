import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ExpressRedisCache from "express-redis-cache";
import {
  getOrgs,
  getProject,
  changeProjectLocation,
  getMaterial,
} from "./api.js";
dotenv.config();

const app = express();
const port = +process.env.EXPRESS_PORT;

async function returnOrgs(req, res) {
  const data = await getOrgs();
  res.json(data);
}

async function updateLocation(req, res) {
  const qs = req.originalUrl.substring(1).split("?")[1];
  console.log(qs);
  const data = await changeProjectLocation(qs);
  res.json(data);
}

async function returnProject(req, res) {
  const data = await getProject();
  console.log("project returned!");
  res.json(data);
}

async function returnMaterials(req, res) {
  const qs = req.originalUrl.substring(1).split("?")[1];
  const keyValuePairs = qs.split("&");
  const dictionary = keyValuePairs
    .map((d) => {
      const key = d.split("=")[0];
      const value = d.split("=")[1];
      return { [key]: value };
    })
    .reduce((acc, current) => ({ ...acc, ...current }), {});
  //TODO: Remove hardcoding and deal with queryString
  const materialList = ["Concrete", "Steel", "Brick", "Masonry", "Wood"]
  const asyncFunctions = materialList.map((d) => getMaterial(dictionary["project"], d))
  const result = await Promise.all(asyncFunctions)
  const resultObj = result.reduce((acc, curr) => ({...acc, ...curr}), {})
  console.log("materials returned!");
  res.json(resultObj);
}

const cache = ExpressRedisCache({
  host: process.env.CACHE_HOST,
  port: +process.env.CACHE_PORT,
})
app.use(cors());

app.get("/orgs/", cache.route(), returnOrgs);

app.get("/project/", cache.route(), returnProject);

app.get("/location/", cache.route(), updateLocation);

app.get("/material/", cache.route(), returnMaterials);

app.listen(port, () => {
  console.log(`Express app listening at http://localhost:${port}`);
});
