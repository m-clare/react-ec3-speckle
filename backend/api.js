import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const baseURL = `https://buildingtransparency.org/api`;

const getVerifiedProperties = (object) => {
  for (const key of Object.keys(object)) {
    if (object[key] === null) {
      return false;
    }
  }
  return true;
};

// NOTE (MCW): Fix to new auth method for EC3
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
      console.error(error);
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
      console.error(error);
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
      console.error(error);
    });
};

const changeProjectLocation = async (locationString) => {
  const headers = await getHeaders();
  const projectInfo = await getProject();
  const location = decodeURI(locationString);
  const body = JSON.stringify({ name: projectInfo?.name, address: location });
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
      console.error(error);
    });
};

const propertiesWithUnits = [
  "gwp_per_category_declared_unit",
  "declared_unit",
  "gwp_per_kg",
  "density",
  "conservative_estimate",
];

const acceptableUnits = {
  concrete: "1 m3",
  steel: "1 t",
  wood: "1 m3",
  cmu: "1 m3",
  brick: "1 m3",
};

const getMaterial = async (materialName, distance) => {
  const headers = await getHeaders();
  const projectID = process.env.BUILDING_ID
    ? process.env.BUILDING_ID
    : await getProjectID(process.env.BUILDING_NAME);
  // TODO: should be ammended to provide more granular material selection
  const distanceRadius = distance ? distance : 1000; // distance in miles
  const hashTable = {
    steel: "db641aa0dbc34d6096547da02bf73f3a",
    concrete: "b03dba1dca5b49acb1a5aa4daab546b4",
    cmu: "4ec837a26a0a493786442296f4cb2730",
    brick: "4ec837a26a0a493786442296f4cb2730",
    wood: "fd14efc8874c4a55ac30d84a5612feb1",
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
  // TODO: Add option for selecting strength or
  // encoding as part of Speckle object
  if (materialName === "concrete") {
    url = url + "&concrete_compressive_strength_28d=5000%20psi";
  }
  if (distance) {
    url = url + `&plant__distance__lt=${distanceRadius}%20mi`;
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
      const data = rawData
        .map((d) => {
          // filter to smaller number of fields
          let processedData = {
            name: d.name,
            description: d.description,
            declared_unit: d.declared_unit,
            gwp_per_kg: d.gwp_per_kg,
            gwp_per_category_declared_unit: d.gwp_per_category_declared_unit,
            density: d.density,
            plant_or_group: d.plant_or_group,
            conservative_estimate: d.conservative_estimate,
          };
          // Filtered data to only include properly declared units
          // TODO: Generalization for mapping units...
          // but I don't have time for this right now
          if (
            getVerifiedProperties(processedData) &&
            processedData.declared_unit === acceptableUnits[materialName]
          ) {
            for (const property of propertiesWithUnits) {
              const splitData = processedData[property].split(" ");
              processedData = {
                ...processedData,
                [property]: {
                  value: +splitData[0] ?? 0.0,
                  unit: splitData[1] ?? "",
                },
              };
            }
            return processedData;
          }
        })
        .filter((d) => d !== undefined && !d.name.includes("EUROSPAN"));
      return { [materialName]: data };
    })
    .catch((error) => {
      console.error(error);
    });
};

export { changeProjectLocation, getProject, getMaterial };
