import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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

async function returnMaterial(req, res) {
  const qs = req.originalUrl.substring(1).split("?")[1];
  const keyValuePairs = qs.split("&");
  const dictionary = keyValuePairs
    .map((d) => {
      const key = d.split("=")[0];
      const value = d.split("=")[1];
      return { [key]: value };
    })
    .reduce((acc, current) => ({ ...acc, ...current }), {});
  const data = await getMaterial(dictionary["project"], dictionary["material"]);
  // filter data a bit...
  const returnData = data.map((d) => ({
    name: d.name,
    description: d.description,
    best_practice_value: +d.best_practice.split(" ")[0],
    best_practice_value_unit: d.best_practice.split(" ")[1],
    density: +d.density.split(" ")[0],
    density_unit: d.density.split(" ")[1],
    gwp_z: d.gwp_z,
    gwp_per_kg: +d.gwp_per_kg.split(" ")[0],
    gwp_per_kg_unit: d.gwp_per_kg.split(" ")[1],
    gwp_per_category_declared_unit: d.gwp_per_category_declared_unit
  }));
  console.log("material returned!");
  res.json(returnData);
}
app.use(cors());

app.get("/orgs/", returnOrgs);

app.get("/project/", returnProject);

app.get("/location/", updateLocation);

app.get("/material/", returnMaterial);

app.listen(port, () => {
  console.log(`Express app listening at http://localhost:${port}`);
});
