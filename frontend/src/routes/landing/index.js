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

function isEmpty(object) {
  return JSON.stringify(object) === "{}"
}

export default function Landing() {
  const [materialInfo, setMaterialInfo] = useState({});
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
    console.log(isEmpty(projectData))
    console.log(isEmpty(speckleObjects))
    if (!isEmpty(projectData) && !isEmpty(speckleObjects)) {
      async function getAllMaterials(project, materials) {
        const results = await getMaterial(projectData.id)
        setMaterialInfo(results)
        console.log(results)
        return results
        // const results = await Promise.all(asyncFunctions)
      }
      // Brick does not work unless in Beta
      const materialSet = Array.from(new Set(speckleObjects.map(d => d.Material))).filter(d => d !== "Brick")
      getAllMaterials(projectData.id, materialSet)
      // const data = getAllMaterials(projectData.id, materialSet)
      // console.log(data)
    }
  }, [speckleObjects, projectData])

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
