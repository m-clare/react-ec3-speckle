import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const baseURL = `https://etl-api.cqd.io/api`;
const headers = {
  Authorization: `Bearer ${process.env.EC3_TOKEN}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const getProject = async () => {
  return await fetch(baseURL + "/projects/" + process.env.BUILDING_ID, {
    method: "GET",
    headers: headers,
  })
    .then((response) => {
      if (response.ok) {
        return response;
      } else if (response.status >= 400 && response.status < 600) {
        throw new Error("Bad response from server");
      } else if (typeof response === "undefined") {
        throw new Error("Response was undefined");
      } else {
        throw new Error("Unknown error in fetch response.");
      }
    })
    .then((returnedResponse) => returnedResponse.json())
    .catch((error) => {
      console.log(error);
    });
};
const changeProjectLocation = async (locationString) => {
  console.log(locationString);
  console.log(decodeURIComponent(locationString));
  return await fetch(baseURL + "/projects/" + process.env.BUILDING_ID, {
    method: "PUT",
    headers: headers,
    body: JSON.stringify({
      name: process.env.BUILDING_NAME,
      address: locationString,
    }),
  })
    .then((response) => {
      if (response.ok) {
        return response;
      } else if (response.status >= 400 && response.status < 600) {
        throw new Error("Bad response from server");
      } else if (typeof response === "undefined") {
        throw new Error("Response was undefined");
      } else {
        throw new Error("Unknown error in fetch response.");
      }
    })
    .then((returnedResponse) => returnedResponse.json())
    .catch((error) => {
      console.log(error);
    });
};

const getOrgs = async () => {
  return await fetch(baseURL + "/orgs", { method: "GET", headers: headers })
    .then((response) => {
      if (response.ok) {
        return response;
      } else if (response.status >= 400 && response.status < 600) {
        throw new Error("Bad response from server");
      } else if (typeof response === "undefined") {
        throw new Error("Response was undefined");
      } else {
        throw new Error("Unknown error in fetch response.");
      }
    })
    .then((returnedResponse) => returnedResponse.json())
    .catch((error) => {
      console.log(error);
    });
};

const getMaterial = async (projectID, materialName) => {
  const hashTable = {
    Brick: "4ec837a26a0a493786442296f4cb2730",
    Steel: "de95ab7d6ab5488bb87d20177f942d2a",
    Concrete: "b03dba1dca5b49acb1a5aa4daab546b4",
    Masonry: "4ec837a26a0a493786442296f4cb2730",
    Wood: "e4aa9c1808ad41b6944db88e51d877ba",
  };
  let url =
    baseURL +
    "/materials?" +
    "category=" +
    hashTable[materialName] +
    "&project_id=" +
    projectID +
    "&plant__distance__lt=1000%20mi" +
    "&sort_by=+plant__distance" +
    "&page_size=50";
  if (materialName === "Concrete") {
    url= url + "&concrete_compressive_strength_28d=5000%20psi"
  }
  return await fetch(url, {
    method: "GET",
    headers: headers,
  })
    .then((response) => {
      if (response.ok) {
        return response;
      } else if (response.status >= 400 && response.status < 600) {
        throw new Error("Bad response from server");
      } else if (typeof response === "undefined") {
        throw new Error("Response was undefined");
      } else {
        throw new Error("Unknown error in fetch response.");
      }
    })
    .then((returnedResponse) => returnedResponse.json())
    .then((rawData) => {
      const data = rawData.map((d) => ({
        name: d.name,
        description: d.description,
        best_practice_value: +d.best_practice.split(" ")[0],
        best_practice_value_unit: d.best_practice.split(" ")[1],
        density: +d.density.split(" ")[0],
        density_unit: d.density.split(" ")[1],
        gwp_z: d.gwp_z,
        gwp_per_kg: +d.gwp_per_kg.split(" ")[0],
        gwp_per_kg_unit: d.gwp_per_kg.split(" ")[1],
        gwp_per_category_declared_unit: d.gwp_per_category_declared_unit,
        plant_or_group: d.plant_or_group
      }));
      return {[materialName]: data}
    })
    .catch((error) => {
      console.log(error);
    });
};

export { getOrgs, changeProjectLocation, getProject, getMaterial };
