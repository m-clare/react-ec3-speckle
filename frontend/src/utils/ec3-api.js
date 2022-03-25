import axios from "axios";

function getProject() {
  const url = `${process.env.REACT_APP_NODE_SERVER}/project`;
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((error) => console.error(`Error: ${error}`));
}

function getMaterial(materials, location) {
  const searchParams = new URLSearchParams()
  searchParams.set("location", location)
  searchParams.set("materials", materials.sort().join())
  const qs = searchParams.toString().toLowerCase()
  const url = `${process.env.REACT_APP_NODE_SERVER}/material?` + qs;
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((error) => console.error(`Error: ${error}`));
}
export { getProject, getMaterial };
