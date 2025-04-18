import { React, useState, useEffect } from "react";

// Custom Component Imports
import { BarChart } from "../../components/barChart";
import { DataTable } from "../../components/dataTable";
import { getProject, getMaterial, setLocation } from "../../utils/ec3-api";

// MUI Imports
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import * as d3 from "d3";

import { useQuery, gql } from "@apollo/client";

const GET_SPECKLEOBJECTS = gql`
  query {
    project(id: "6d6cbc1bdf") {
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

// General JS Helper Functions
function isEmpty(object) {
  return JSON.stringify(object) === "{}";
}

function capitalizeWords(string) {
  const words = string.split(" ");
  return words
    .map((word) => word[0].toUpperCase() + word.substring(1))
    .join(" ");
}

// TODO: Get this from backend when category is retrieved
const categoryUnit = {
  brick: "1 m³",
  steel: "1 ton",
  concrete: "1 m³",
  cmu: "1 m³",
  wood: "1 m³",
};

export default function Landing() {
  const [materialInfo, setMaterialInfo] = useState({});
  const [projectData, setProjectData] = useState({});
  const [speckleObjects, setSpeckleObjects] = useState({});
  const [activeMaterial, setActiveMaterial] = useState("concrete");
  const [newLocation, setNewLocation] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { loading, data } = useQuery(GET_SPECKLEOBJECTS);

  // TODO: Fix control flow for location update
  // to reduce number of side effects required here
  // should be able to consolidate this

  // Gets project info on initial load
  useEffect(() => {
    async function initializeProject() {
      let projectData = (await getProject()) ?? {};
      setProjectData(projectData);
    }
    initializeProject();
  }, []);

  // Triggers material fetch update because projectData gets updated
  useEffect(() => {
    if (submitted && newLocation) {
      async function updateProjectLocationData() {
        const updatedProjectData = await setLocation(newLocation);
        setProjectData(updatedProjectData);
        setSubmitted(false);
      }
      updateProjectLocationData();
    }
  }, [submitted, newLocation]);

  // Loads speckle object info into state (usually just once)
  useEffect(() => {
    if (!loading && data?.project?.object?.children?.objects) {
      const filteredData = data.project.object.children.objects.map(
        (object) => object.data
      );
      setSpeckleObjects(filteredData);
    }
  }, [loading, data]);

  // Gets materials info based on Speckle Objects and Project Data
  useEffect(() => {
    if (!isEmpty(projectData) && !isEmpty(speckleObjects)) {
      // NOTE: Brick does not work, currently set to masonry (only available in beta)
      async function fetchMaterials() {
        const materialSet = Array.from(
          new Set(speckleObjects.map((d) => d.Material))
        );
        const results =
          (await getMaterial(materialSet, projectData.address)) ?? {};
        setMaterialInfo(results);
      }
      fetchMaterials();
    }
  }, [speckleObjects, projectData]);

  const handleLocationSubmit = () => {
    setSubmitted(true);
  };

  // Set dependent properties after data is loaded (derived properties)
  let materialQuantities = {
    columns: [
      {
        field: "name",
        headerName: "Material Category",
        width: 160,
        align: "left",
      },
      {
        field: "volume",
        headerName: "Volume",
        width: 120,
        align: "center",
        headerAlign: "center",
      },
      {
        field: "avgDensity",
        headerName: "Density",
        width: 120,
        align: "center",
        headerAlign: "center",
      },
      {
        field: "avgGWP",
        headerName: "GWP per kg material",
        width: 180,
        align: "center",
        headerAlign: "center",
      },
      {
        field: "totalGWP",
        headerName: "Total GWP",
        minWidth: 158,
        align: "right",
        headerAlign: "right",
      },
    ],
  };

  if (!isEmpty(speckleObjects) && !isEmpty(materialInfo)) {
    const materialSet = Array.from(
      new Set(speckleObjects.map((d) => d.Material.toString().toLowerCase()))
    );
    let rows = [];
    let count = 1;
    let materialsTotalGWP = 0;
    for (const material of materialSet) {
      if (
        materialInfo[material] !== undefined &&
        materialInfo[material].length > 0
      ) {
        const stats = materialInfo[material];
        const volume = speckleObjects
          .filter((d) => d.Material.toLowerCase() === material)
          .map((d) => +d.Volume)
          .reduce((acc, curr) => curr + acc, 0)
          .toFixed(2);
        const avgGWP = d3
          .mean(
            stats.map(
              (d) =>
                (d.gwp_per_kg.value * d.conservative_estimate.value) /
                d.gwp_per_category_declared_unit.value
            )
          )
          .toFixed(2);
        const gwpUnit = stats[0].gwp_per_category_declared_unit.unit;
        const avgDensity = d3.mean(
          stats
            .map((d) => d.density?.value.toFixed(2))
            .filter((d) => d !== undefined)
        );
        let densityUnit = stats[0].density.unit;
        // Fix density unit as otherwise it looks bizarre (kg is often returned from EC3 API)
        if (densityUnit === "kg") {
          densityUnit = "kg/m³";
        }
        const totalGWP =
          stats[0].density.unit.indexOf("kg") !== -1
            ? (volume * avgDensity * avgGWP).toFixed(0)
            : 0.0;

        rows = [
          ...rows,
          {
            id: count,
            name: capitalizeWords(material),
            volume: volume.toString() + " m³",
            avgDensity: avgDensity + " " + densityUnit,
            avgGWP: avgGWP + " " + gwpUnit,
            totalGWP: totalGWP + " kgCO2e",
          },
        ];
        count += 1;
      }
    }
    materialsTotalGWP = rows
      .map((d) => +d.totalGWP.split(" ")[0])
      .reduce((curr, acc) => curr + acc, 0.0);
    rows = [
      ...rows,
      { id: count, name: "Total", totalGWP: materialsTotalGWP + " kgCO2e" },
    ];

    materialQuantities = { ...materialQuantities, rows };
  }

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
            <Typography variant="h5">
              Project Name: {projectData?.name}
            </Typography>
            <Typography variant="h5">
              Project Address: {projectData?.address}
            </Typography>
          </Grid>
          <Grid container item xs={12} md={6}>
            <Grid item xs={12}>
              <Box p={1}>
                <iframe
                  title="Speckle"
                  src="https://app.speckle.systems/projects/6d6cbc1bdf/models/055316fee9#embed=%7B%22isEnabled%22%3Atrue%2C%22isTransparent%22%3Atrue%7D"
                  width="100%"
                  height="400"
                  frameBorder="0"
                ></iframe>
              </Box>
            </Grid>
            <Grid item xs={8} sx={{ paddingLeft: 1, paddingRight: 1 }}>
              <TextField
                fullWidth
                id="address-input"
                label="Address"
                variant="outlined"
                helperText="Input address (i.e. City + State or Zip Code)"
                disabled={submitted}
                onChange={(event) => {
                  setNewLocation(event.target.value);
                }}
              />
            </Grid>
            <Grid
              item
              xs={4}
              sx={{
                paddingLeft: 1,
                paddingRight: 1,
                paddingBottom: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Button
                variant="contained"
                disableElevation
                disabled={submitted}
                size="large"
                fullWidth
                disabled={submitted}
                onClick={handleLocationSubmit}
              >
                Submit
              </Button>
            </Grid>
          </Grid>
          <Grid item xs={12} md={6}>
            {!isEmpty(materialInfo) && !submitted ? (
              <>
                <Typography variant="h6">
                  Closest (Geographic) {capitalizeWords(activeMaterial)}
                </Typography>
                <Typography variant="h6">
                  Environmental Product Declarations (EPDs)
                </Typography>
                <BarChart
                  data={materialInfo[activeMaterial]}
                  color="green"
                  height={400}
                  x={(d, i) => i + " " + d.name}
                  y={(d) => d.gwp_per_category_declared_unit.value}
                  yLabel={
                    "↑ GWP kgCO2e per EC3 category declared unit - " +
                    categoryUnit[activeMaterial]
                  }
                />
                <FormControl>
                  <InputLabel id="select-material-label">
                    Selected Material
                  </InputLabel>
                  <Select
                    labelId="select-material-label"
                    id="select-material"
                    value={activeMaterial}
                    label="Selected Material"
                    disabled={submitted}
                    onChange={(event) => {
                      setActiveMaterial(event.target.value);
                    }}
                    sx={{ width: "300px" }}
                  >
                    {" "}
                    {Object.keys(materialInfo).map((material) => (
                      <MenuItem
                        value={material.toLowerCase()}
                        key={material.toLowerCase()}
                      >
                        {material === "cmu" ? "CMU" : capitalizeWords(material)}
                      </MenuItem>
                    ))}
                    }
                  </Select>
                </FormControl>
              </>
            ) : (
              <>
                <Typography>Loading data...</Typography>
                <Box p={6}>
                  <CircularProgress />
                </Box>
              </>
            )}
          </Grid>
          <Grid item xs={12} sx={{ p: 2 }}>
            {materialQuantities.rows && !submitted ? (
              <>
                <Typography variant="h6" pb={2}>
                  Conservative Estimate (Average) Global Warming Potential (GWP)
                </Typography>
                <DataTable
                  rows={materialQuantities.rows}
                  columns={materialQuantities.columns}
                />
              </>
            ) : null}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
