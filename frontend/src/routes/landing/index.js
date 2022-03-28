import { React, useState, useEffect } from "react";
import { BarChart } from "../../components/barChart";
import { getProject, getMaterial, setLocation } from "../../utils/ec3-api";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";

import { useQuery, gql } from "@apollo/client";

const GET_SPECKLEOBJECTS = gql`
  query {
    stream(id: "6d6cbc1bdf") {
      object(id: "ab1a4d9d2c58985b94648a4b105c011e") {
        children(select: ["Volume", "Name", "Material"]) {
          totalCount
          objects {
            totalChildrenCount
            data
          }
        }
      }
    }
  }
`;

function isEmpty(object) {
  return JSON.stringify(object) === "{}";
}

export default function Landing() {
  const [materialInfo, setMaterialInfo] = useState({});
  const [projectData, setProjectData] = useState({});
  const [speckleObjects, setSpeckleObjects] = useState({});
  const [activeMaterial, setActiveMaterial] = useState("concrete");
  const [location, setProjLocation] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { loading, error, data } = useQuery(GET_SPECKLEOBJECTS);

  // Gets project info on initial load
  useEffect(() => {
    async function getProjAsync() {
      let projectData = await getProject();
      setProjectData(projectData);
    }
    getProjAsync();
  }, []);

  useEffect(() => {
    async function setProjLocationAsync() {
      // console.log(location);
      let projectData = await setLocation(location);
      // console.log(projectData);
      setProjectData(projectData);
      setSubmitted(false);
    }
    if (submitted) {
      setProjLocationAsync();
    }
  }, [submitted]);

  // Gets speckle object info
  useEffect(() => {
    if (!loading) {
      const filteredData = data.stream.object.children.objects.map(
        (object) => object.data
      );
      setSpeckleObjects(filteredData);
    }
  }, [loading, data]);

  // Gets materials info based on Speckle Objects and Project Data
  useEffect(() => {
    if (!isEmpty(projectData) && !isEmpty(speckleObjects)) {
      async function getAllMaterials(project, materials) {
        const results = await getMaterial(materials, project.address);
        setMaterialInfo(results);
        return results;
      }
      // NOTE: Brick does not work, currently set to masonry (only available in beta)
      const materialSet = Array.from(
        new Set(speckleObjects.map((d) => d.Material))
      );
      getAllMaterials(projectData, materialSet);
    }
  }, [speckleObjects, projectData]);

  // Set dependent properties after data is loaded
  let materialQuantities = {};

  if (!isEmpty(speckleObjects) && !isEmpty(materialInfo)) {
    const materialSet = Array.from(
      new Set(speckleObjects.map((d) => d.Material.toString().toLowerCase()))
    );
    for (const material of materialSet) {
      const stats = materialInfo[material];
      const volume = speckleObjects
        .filter((d) => d.Material.toLowerCase() === material)
        .map((d) => +d.Volume)
        .reduce((acc, curr) => curr + acc, 0);
      const quantCO2 =
        stats[0].density.unit.indexOf("kg") !== -1
          ? volume * stats[0].density.value * +stats[0].gwp_per_kg.value
          : 0.0;
      const matData = { volume, quantCO2 };
      materialQuantities = { ...materialQuantities, [material]: matData };
    }
  }

  console.log(projectData.address)

  return (
    <Box>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Typography pt={4} variant="h2">
              Speckle 🟦 + EC3 🌳
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6">
              Project Name: {projectData.name}
            </Typography>
            <Typography variant="h6">
              Project Address: {projectData.address}
            </Typography>
          </Grid>
          <Grid container item xs={12} md={6}>
            <Grid item xs={12}>
              <Box p={1}>
                <iframe
                  src="https://speckle.xyz/embed?stream=6d6cbc1bdf&commit=a3feac7246"
                  width={"100%"}
                  height={400}
                />
              </Box>
            </Grid>
            <Grid item xs={8} sx={{ paddingLeft: 1, paddingRight: 1 }}>
              <TextField
                fullWidth
                id="address-input"
                label="Input New Address"
                variant="outlined"
                onChange={(event) => {
                  setProjLocation(event.target.value);
                }}
              />
            </Grid>
            <Grid
              item
              xs={4}
              sx={{
                paddingLeft: 1,
                paddingRight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Button
                variant="contained"
                disableElevation
                size="large"
                fullWidth
                onClick={(event) => {
                  setSubmitted(true)}}
              >
                Submit
              </Button>
            </Grid>
          </Grid>
          <Grid item xs={12} md={6}>
            {!isEmpty(materialInfo) && !submitted ? (
              <>
                <Typography variant="h6">
                  Closest (Geographic) {activeMaterial} GWPs
                </Typography>
                <BarChart
                  data={materialInfo[activeMaterial]}
                  color="green"
                  height={450}
                  x={(d, i) => i + " " + d.name}
                  y={(d) => d.gwp_per_category_declared_unit.value}
                  yLabel="↑ GWP kgCO2e"
                />
                <Select
                  labelId="select-material"
                  id="select-material"
                  value={activeMaterial}
                  label="Material"
                  onChange={(event) => {
                    setActiveMaterial(event.target.value);
                  }}
                  sx={{ width: "300px" }}
                >
                  {" "}
                  {Object.keys(materialInfo).map((material) => (
                    <MenuItem value={material.toLowerCase()}>
                      {material === "cmu"
                        ? "CMU"
                        : material[0].toUpperCase() + material.substring(1)}
                    </MenuItem>
                  ))}
                  }
                </Select>
              </>
            ) : (
              <Typography>Loading data...</Typography>
            )}
          </Grid>
          <Grid item xs={12} sx={{ p: 2 }}>
            {!isEmpty(materialQuantities) && !isEmpty(materialInfo) ? (
              <ul style={{ listStyle: "none" }}>
                {Object.keys(materialQuantities).map((material) => (
                  <li>
                    <Typography>
                      {material}:{" "}
                      {materialQuantities[material].volume.toFixed(2)} cubic
                      meters -{" "}
                      {Math.round(materialQuantities[material].quantCO2)}{" "}
                      kgCO2eq
                    </Typography>
                  </li>
                ))}
              </ul>
            ) : (
              <Typography>No material quantities available!</Typography>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
