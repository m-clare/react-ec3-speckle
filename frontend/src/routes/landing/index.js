import { React, useState, useEffect } from "react";
import { BarChart } from "../../components/barChart";
import { getProject, getMaterial } from "../../utils/ec3-api";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Select from "@mui/material/Select";
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
  const { loading, error, data } = useQuery(GET_SPECKLEOBJECTS);

  const handleChange = (event) => {
    setActiveMaterial(event.target.value);
  };

  // Gets project info on initial load
  useEffect(() => {
    async function getProjAsync() {
      let data = await getProject();
      setProjectData(data);
      return data;
    }
    getProjAsync();
  }, []);

  // Gets speckle object info
  useEffect(() => {
    if (!loading) {
      const filteredData = data.stream.object.children.objects.map(
        (object) => object.data
      );
      setSpeckleObjects(filteredData);
    }
  }, [loading, data.stream.object.children.objects]);

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

  return (
    <Box>
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          <Grid item xs={12} sx={{ paddingTop: 5 }}>
            <Typography variant="h2">Speckle 🌐 + EC3 🌳</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body1">
              Project Name: {projectData.name}
            </Typography>
            <Typography variant="body1">
              Project Address: {projectData.address}
            </Typography>
            <Box p={3}>
              <iframe
                src="https://speckle.xyz/embed?stream=6d6cbc1bdf&commit=a3feac7246"
                width={"100%"}
                height={400}
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            {!isEmpty(materialInfo) ? (
              <>
                <Typography variant="h6">
                  Closest (Geographic) {activeMaterial} GWPs
                </Typography>
                <BarChart
                  data={materialInfo[activeMaterial]}
                  color="green"
                  x={(d) => d.name}
                  y={(d) => d.conservative_estimate.value}
                  yLabel="↑ GWP kgCO2e"
                />
                <Select
                  labelId="select-material"
                  id="select-material"
                  value={activeMaterial}
                  label="Material"
                  onChange={handleChange}
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
                      {Math.round(materialQuantities[material].quantCO2)} kgCO2eq
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
