import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

const MAX_FILE_SIZE = 5000000;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().max(200, 'Description is too long').optional(),
  longitude: z
    .number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude')
    .nullable()
    .refine((val) => val !== null, 'Location is required'),
  latitude: z
    .number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude')
    .nullable()
    .refine((val) => val !== null, 'Location is required'),
  image: z
    .instanceof(File, { message: 'Required Image' })
    .refine((file) => file?.size <= MAX_FILE_SIZE, 'Required Image (size must be less than 5MB)')
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type),
      'Invalid image type. Only JPEG, JPG and PNG are allowed'
    ),
  isFurnished: z.boolean(),
  offerPrice: z.coerce.string().refine((value) => {
    return !isNaN(Number(value)) && Number(value) > 0;
  }, 'Offer price must be a positive number'),
  offerType: z.enum(['for_rent', 'for_sale']).refine((value) => {
    return value !== undefined;
  }, 'Offer type is required'),
  floorNumber: z.coerce.string().refine((value) => {
    return !isNaN(Number(value)) && Number(value) > 0;
  }, 'Floor Number must be a positive number'),
  roomCount: z.coerce.string().refine((value) => {
    return !isNaN(Number(value)) && Number(value) > 0;
  }, 'Room Count must be a positive number'),
  bathroomCount: z.coerce.string().refine((value) => {
    return !isNaN(Number(value)) && Number(value) > 0;
  }, 'Bathroom Count must be a positive number'),
  bedCount: z.coerce.string().refine((value) => {
    return !isNaN(Number(value)) && Number(value) > 0;
  }, 'Bed Count must be a positive number'),
  area: z.coerce.string().refine((value) => {
    return !isNaN(Number(value)) && Number(value) > 0;
  }, 'Area must be a positive number'),
  appliances: z.string().optional()
});

export function CreateOffersPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState<boolean>(false);
  const [location, setLocation] = useState({ lat: 30.424776, lng: 31.039046 });
  const markerRef = useRef(null);

  const markerEventHandlers = useMemo(
    () => ({
      dragend() {
        const marker: any = markerRef.current;
        if (marker != null) {
          setLocation(marker.getLatLng());
          form.clearErrors('longitude');
          form.clearErrors('latitude');
        }
      }
    }),
    []
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      longitude: undefined,
      latitude: undefined,
      isFurnished: false,
      offerType: undefined,
      offerPrice: '',
      floorNumber: '',
      roomCount: '',
      bathroomCount: '',
      bedCount: '',
      area: '',
      appliances: ''
    },
    mode: 'onBlur'
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setImage(file);
    form.setValue('image', file); // Set the File object itself
    form.clearErrors('image'); // Clear validation errors on valid selection
  };

  function handleLocationButtonClicked() {
    setIsLocationDialogOpen(true);
  }

  const onSubmit = async () => {
    if (form.getValues('longitude') === null || form.getValues('latitude') === null) {
      form.setError('longitude', { type: 'manual', message: 'Location is required' });
      form.setError('latitude', { type: 'manual', message: 'Location is required' });
      return;
    }

    console.log('Creating offer');
    setCreateErr(null);
    const data = new FormData();
    console.log(form.getValues());

    data.append('title', form.getValues('title'));
    data.append('description', form.getValues('description'));
    data.append('longitude', form.getValues('longitude').toString());
    data.append('latitude', form.getValues('latitude').toString());
    data.append('isFurnished', form.getValues('isFurnished').toString());
    data.append('offerType', form.getValues('offerType'));
    data.append('offerPrice', form.getValues('offerPrice').toString());
    data.append('floorNumber', form.getValues('floorNumber').toString());
    data.append('roomCount', form.getValues('roomCount').toString());
    data.append('bathroomCount', form.getValues('bathroomCount').toString());
    data.append('bedCount', form.getValues('bedCount').toString());
    data.append('area', form.getValues('area').toString());
    data.append('appliances', form.getValues('appliances'));

    data.append('images', image);
    data.delete('image'); // redundant entry (will be undefined anyway)
    console.log(data);

    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/offers/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || ''
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        navigate('/profile/offers');
      }
      const responseData = await response.json();
      setCreateErr(responseData.message);

      if (responseData.name === 'ValidationError' && responseData.details) {
        // Loop through the errors and set them in the form
        Object.keys(responseData.details).forEach((field) => {
          const messages = responseData.details[field]; // Array of messages
          if (messages.length > 0) {
            form.setError(field as keyof typeof data, {
              type: 'server',
              message: messages.join(', ') // Combine multiple messages if needed
            });
          }
        });
      }
    } catch (error) {
      console.error('An error occurred:', error);
      setCreateErr('An error occurred. Please try again later.');
    }
  };

  return (
    <Card className="my-10 py-5 mx-auto container ">
      <CardHeader>
        <CardTitle>Create Offer</CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="longitude"
              render={() => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Button
                      className="w-full"
                      type="button"
                      variant={'outline'}
                      onClick={handleLocationButtonClicked}>
                      Choose Location{' '}
                      {form.getValues('longitude') && form.getValues('latitude')
                        ? `(${form.getValues('longitude')}, ${form.getValues('latitude')})`
                        : '(Not Selected)'}
                    </Button>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location Dialog */}
            <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
              <DialogContent
                className="sm:max-w-[70vw] top-[75%] left-[75%] lg:max-w-[60vw] xl:max-w-[50vw]"
                onCloseAutoFocus={() => false}>
                <DialogHeader>
                  <DialogTitle>Select the location of the apartment</DialogTitle>
                  <DialogDescription>Drag the marker to the desired location</DialogDescription>
                </DialogHeader>
                <div className="container">
                  <MapContainer
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    /*@ts-expect-error*/
                    center={location}
                    zoom={13}
                    style={{ height: '400px', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker
                      position={location}
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      /*@ts-expect-error*/
                      draggable={true}
                      eventHandlers={markerEventHandlers}
                      ref={markerRef}
                    />
                  </MapContainer>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    onClick={() => {
                      form.setValue('longitude', location.lng);
                      form.setValue('latitude', location.lat);
                      setIsLocationDialogOpen(false);
                    }}>
                    Save changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <FormField
              control={form.control}
              name="image"
              render={() => (
                <FormItem>
                  <FormLabel>Image</FormLabel>
                  <FormControl>
                    <Input type="file" onChange={handleImageChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="isFurnished"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="pb-[8px]">Is Furnished</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="offerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Offer type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select offer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="for_rent">For Rent</SelectItem>
                        <SelectItem value="for_sale">For Sale</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="offerPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Offer Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Offer price"
                        {...field}
                        onChange={(event) => field.onChange(+event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="floorNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor Number</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Floor Number"
                        {...field}
                        onChange={(event) => field.onChange(+event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roomCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Room Count"
                        {...field}
                        onChange={(event) => field.onChange(+event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bathroomCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bathroom Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Bathroom Count"
                        {...field}
                        onChange={(event) => field.onChange(+event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bedCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bed Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Bed Count"
                        {...field}
                        onChange={(event) => field.onChange(+event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Area"
                        {...field}
                        onChange={(event) => field.onChange(+event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="appliances"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appliances</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Appliance"
                        {...field}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {createErr && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{createErr}</AlertDescription>
              </Alert>
            )}

            <Button className="w-full" type="submit">
              Create Offer
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
