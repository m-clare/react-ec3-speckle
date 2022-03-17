import { React, useState, useEffect } from "react";
import { SpeckleData } from "../../components/speckleData";
import { BarChart } from "../../components/barChart";
import { getOrgs, getProject, getMaterial } from "../../utils/ec3-api";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";

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

export default function Landing() {
  const [epds, setEPDs] = useState({});
  const [projectData, setProjectData] = useState({});
  const [speckleObjects, setSpeckleObjects] = useState({});
  const { loading, error, data } = useQuery(GET_SPECKLEOBJECTS);

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
      const filteredData = data.stream.object.children.objects.map((object) => object.data)
      setSpeckleObjects(filteredData);
    }
  }, [loading]);

  useEffect(() => {
    if (!loading && !(JSON.stringify(speckleObjects) === "{}")) {
      async function getAllMaterials(project, materials) {
        const asyncFunctions = materials.map((d) => getMaterial(projectData.id, d))
        const results = await Promise.all(asyncFunctions)
      }
      const materialSet = Array.from(new Set(speckleObjects.map(d => d.Material)))
      const data = getAllMaterials(projectData.id, materialSet)
      console.log(data)
    }
  }, [speckleObjects])

  return (
    <Box>
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h2">Speckle + EC3</Typography>
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
          <Grid item xs={12} md={6}></Grid>
        </Grid>
      </Container>
    </Box>
  );
}
