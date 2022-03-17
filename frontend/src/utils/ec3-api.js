import axios from "axios";

function getOrgs() {
  const url = `${process.env.REACT_APP_NODE_SERVER}/orgs`;
  console.log(url);
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((error) => console.error(`Error: ${error}`));
}

function getProject() {
  const url = `${process.env.REACT_APP_NODE_SERVER}/project`;
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((error) => console.error(`Error: ${error}`));
}

function getMaterial(project, materialName) {
  const qs = "project=" + project + "&material=" + materialName;
  const url = `${process.env.REACT_APP_NODE_SERVER}/material?` + qs;
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((error) => console.error(`Error: ${error}`));
}
export { getOrgs, getProject, getMaterial };
