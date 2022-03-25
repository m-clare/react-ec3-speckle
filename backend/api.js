import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const baseURL = `https://etl-api.cqd.io/api`;

// EC3 username and password must be provided at a minimum
const EC3_username = process.env.EC3_USERNAME;
const EC3_password = process.env.EC3_PASSWORD;

const getBearerToken = (username, password) => {
  return fetch(baseURL + "/rest-auth/login", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ username: username, password: password }),
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
    .then((responseJson) => responseJson.key) // return only key from object
    .catch((error) => {
      console.log(error);
    });
};

const getHeaders = async () => {
  // Either provide EC3 Token in .env, or provide username and password
  const token = process.env.EC3_TOKEN
    ? process.env.EC3_TOKEN
    : await getBearerToken(process.env.EC3_USERNAME, process.env.EC3_PASSWORD);
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
};

const getProjectID = async (projectName) => {
  const headers = await getHeaders();
  return await fetch(baseURL + `/projects?name__like=${projectName}`, {
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
    .then((responseJSON) => {
      return responseJSON[0].id;
    })
    .catch((error) => {
      console.log(error);
    });
};

const getProject = async () => {
  const headers = await getHeaders();
  // provide building ID in .env or provide building name for EC3 match
  // If multiple matches in EC3, returns first building
  const projectID = process.env.BUILDING_ID
    ? process.env.BUILDING_ID
    : await getProjectID(process.env.BUILDING_NAME);
  return await fetch(baseURL + "/projects/" + projectID, {
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
    .then((returnedResponse) => {
      return returnedResponse.json();
    })
    .catch((error) => {
      console.log(error);
    });
};

const changeProjectLocation = async (locationString) => {
  const headers = await getHeaders();
  const projectInfo = await getProject();
  const location = decodeURI(locationString);
  const body = JSON.stringify({ name: projectInfo.name, address: location });
  return await fetch(baseURL + "/projects/" + projectInfo.id, {
    method: "PUT",
    headers: headers,
    body: body,
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
    .then((returnedResponse) => {
      return returnedResponse.json();
    })
    .catch((error) => {
      console.log(error);
    });
};

const getMaterial = async (materialName, distance) => {
  const headers = await getHeaders();
  const projectID = process.env.BUILDING_ID
    ? process.env.BUILDING_ID
    : await getProjectID(process.env.BUILDING_NAME);
  // TODO: should be ammended to provide more granular material selection
  const distanceRadius = distance ? distance : 1000; // distance in miles
  const hashTable = {
    brick: "4ec837a26a0a493786442296f4cb2730",
    steel: "de95ab7d6ab5488bb87d20177f942d2a",
    concrete: "b03dba1dca5b49acb1a5aa4daab546b4",
    cmu: "4ec837a26a0a493786442296f4cb2730",
    wood: "e4aa9c1808ad41b6944db88e51d877ba",
  };
  let url =
    baseURL +
    "/materials?" +
    "category=" +
    hashTable[materialName] +
    "&project_id=" +
    projectID +
    "&sort_by=+plant__distance" +
    "&page_size=50";
  // Filter by reasonable concrete strength
  if (materialName === "concrete") {
    url = url + "&concrete_compressive_strength_28d=5000%20psi";
  }
  if (distance) {
    url = url + `&plant__distance__lt=${distanceRadius}%20mi` 
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
        plant_or_group: d.plant_or_group,
      }));
      return { [materialName]: data };
    })
    .catch((error) => {
      console.log(error);
    });
};

export { changeProjectLocation, getProject, getMaterial };
