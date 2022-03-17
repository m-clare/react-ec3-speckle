import { React, useState } from "react";
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

export const SpeckleData = ({getData}) => {
  const { loading, error, data } = useQuery(GET_SPECKLEOBJECTS);

  if (loading) return 'Loading...';;
  if (error) return `Error! ${error.message}`;

  if (!loading) {
    getData(data.stream.object.children.objects)
  }

  return (
    <ul>
      {data.stream.object.children.objects.map((object, i) => (
        <li key={i}>{object.data.Volume} {object.data.Name} {object.data.Material}</li>
      ))}
    </ul>
  )
}
