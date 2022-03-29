import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import Paper from "@mui/material/Paper";

export function DataTable({rows, columns}) {
  return (
    <div style={{height: 420, width: '70%', margin: '0 auto'}}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10]}
        />
      </div>
  )
}
