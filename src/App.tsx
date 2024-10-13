import React, { useState } from 'react';
import { useQuery, useMutation, QueryClient, QueryClientProvider } from 'react-query';
import axios from 'axios';
import { Plus, Smartphone, QrCode } from 'lucide-react';

const queryClient = new QueryClient();
const API_URL = import.meta.env.VITE_API_URL;

function InstanceManager() {
  const [newInstanceId, setNewInstanceId] = useState('');
  const [selectedInstance, setSelectedInstance] = useState('');

  const { data: instances, refetch: refetchInstances } = useQuery('instances', async () => {
    const response = await axios.get(`${API_URL}/instances`);
    return response.data;
  });

  const createInstanceMutation = useMutation(
    async (instanceId: string) => {
      await axios.post(`${API_URL}/create-instance`, { instanceId });
    },
    {
      onSuccess: () => {
        refetchInstances();
        setNewInstanceId('');
      },
    }
  );

  const { data: qrCode } = useQuery(
    ['qrCode', selectedInstance],
    async () => {
      if (!selectedInstance) return null;
      const response = await axios.get(`${API_URL}/instance/${selectedInstance}/qr`);
      return response.data.qr;
    },
    { enabled: !!selectedInstance }
  );

  const { data: connectedPhones } = useQuery(
    ['connectedPhones', selectedInstance],
    async () => {
      if (!selectedInstance) return [];
      const response = await axios.get(`${API_URL}/instance/${selectedInstance}/phones`);
      return response.data.phones;
    },
    { enabled: !!selectedInstance }
  );

  // ... rest of the component remains the same
}

// ... rest of the file remains the same