import * as React from "react";
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloProvider,
} from "@apollo/client";
import {BrowserRouter, Routes, Route, Link} from "react-router-dom";
import About from "./routes/about";
import Landing from "./routes/landing";
import "./App.css";


const httpLink = {
  uri: "https://speckle.xyz/graphql",
  headers: {
    authorization: `Bearer ${process.env.REACT_APP_SPECKLE_TOKEN}`,
  },
};

const client = new ApolloClient({
  link: new HttpLink(httpLink),
  cache: new InMemoryCache(),
});

function Layout() {
  return (
    <div>
      <nav>
        <ul>
          <li>
            <Link to="/">Landing</Link>
          </li>
          <li>
            <Link to="/about">About</Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}

function App() {
  return (
    <ApolloProvider client={client}>
      <div className="App">
        <Landing />
      </div>
    </ApolloProvider>
  );
}


export default App;
