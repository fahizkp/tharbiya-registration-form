import React from 'react';
import axios from 'axios';
import { useEffect } from 'react';


export default function ApiComponent() {
    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    useEffect(() => {
        axios.get('http://localhost:3000')
            .then(response => {
                setData(response.data);
                setLoading(false);
            })
            .catch(error => {
                setError(error);
                setLoading(false);
            });
    }, []);
    return (
        <div>
            {loading ? "Loading..." : <pre>{JSON.stringify(data, null, 2)}</pre>}
            {error && <div>Error loading data</div>}
        </div>
    );
}