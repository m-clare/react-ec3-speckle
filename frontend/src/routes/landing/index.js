import { React, useState, useEffect } from "react";
import { SpeckleData } from "../../components/speckleData";
import { BarChart } from "../../components/barChart";
import { getOrgs, getProject, getMaterial } from "../../utils/ec3-api";
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

function getMaterialPlotData(materialName, materialData) {
  const plotData = {};
  plotData.x = materialData[materialName].map((d) => d.name);
  plotData.y = materialData[materialName].map((d) => d.best_practice_value);
  return plotData;
}

export default function Landing() {
  const [materialInfo, setMaterialInfo] = useState({});
  const [projectData, setProjectData] = useState({});
  const [speckleObjects, setSpeckleObjects] = useState({});
  const [activeMaterial, setActiveMaterial] = useState("Concrete");
  const [plotData, setPlotData] = useState({});
  const { loading, error, data } = useQuery(GET_SPECKLEOBJECTS);

  const handleChange = (event) => {
    setActiveMaterial(event.target.value);
  };

  useEffect(() => {
    if (!isEmpty(materialInfo)) {
      console.log(Object.keys(materialInfo))
      console.log(materialInfo["Concrete"])
      setPlotData(getMaterialPlotData(activeMaterial, materialInfo));
    }
  }, [activeMaterial, materialInfo]);

  useEffect(() => {
    async function getProjAsync() {
      let data = await getProject();
      setProjectData(data);
      return data;
    }
    getProjAsync();
  }, []);

  useEffect(() => {
    if (!loading) {
      const filteredData = data.stream.object.children.objects.map(
        (object) => object.data
      );
      setSpeckleObjects(filteredData);
    }
  }, [loading]);

  useEffect(() => {
    if (!isEmpty(projectData) && !isEmpty(speckleObjects)) {
      async function getAllMaterials(project, materials) {
        const results = await getMaterial(projectData.id);
        setMaterialInfo(results);
        console.log(results)
        return results;
      }
      // NOTE: Brick does not work, currently set to masonry (only available in beta)
      const materialSet = Array.from(
        new Set(speckleObjects.map((d) => d.Material))
      );
      getAllMaterials(projectData.id, materialSet);
    }
  }, [speckleObjects, projectData]);

  const renderPlot = !isEmpty(plotData); // boolean
  console.log(renderPlot);

  let materialQuantities = {};
  if (!isEmpty(speckleObjects) && !isEmpty(materialInfo)) {
    const materialSet = Array.from(
      new Set(speckleObjects.map((d) => d.Material))
    );
    for (const material of materialSet) {
      const stats = materialInfo[material]
      console.log(stats)
      const volume = speckleObjects
        .filter((d) => d.Material === material)
        .map((d) => +d.Volume)
        .reduce((acc, curr) => curr + acc, 0);
      const quantCO2 = +stats[0].density * +stats[0].best_practice_value * volume
      const matData = {volume, quantCO2}
      materialQuantities = { ...materialQuantities, [material]: matData };
    }
  }

  return (
    <Box>
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          <Grid item xs={12} sx={{paddingTop: 5}}>
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
            {renderPlot ? (
              <>
                <Typography variant="h6">
                  Closest (Geographic) {activeMaterial} GWPs
                </Typography>
                <BarChart data={plotData} />
                <Select
                  labelId="select-material"
                  id="select-material"
                  value={activeMaterial}
                  label="Material"
                  onChange={handleChange}
                  sx={{ width: "300px" }}
                >
                  <MenuItem value="Concrete">Concrete</MenuItem>
                  <MenuItem value="Steel">Steel</MenuItem>
                  <MenuItem value="Masonry">Masonry</MenuItem>
                  <MenuItem value="Wood">Wood</MenuItem>
                </Select>
              </>
            ) : (
              <Typography>Loading data...</Typography>
            )}
          </Grid>
    <Grid item xs={12} sx={{p: 2}}>
          {!isEmpty(materialQuantities) && !isEmpty(materialInfo) ? (
            <ul style={{listStyle: "none"}}>
              {Object.keys(materialQuantities).map((material) => (
                <li>
                  <Typography>
                    {material}: {materialQuantities[material].volume.toFixed(2)} cubic meters - {materialQuantities[material].quantCO2.toFixed(2)} kgCO2eq 
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
