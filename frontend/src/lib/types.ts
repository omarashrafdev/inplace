export interface User {
    id: number;
    first_name: string;
    last_name: string;
    phone_number: string,
    bio: string,
    email: string;
    verified: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Offer {
    id: number;
    title: string;
    description: string | null | undefined;
    longitude: number;
    latitude: number;
    area: number;
    offerType: string;
    offerPrice: number;
    images: string[];
    isFurnished: boolean;
    floorNumber: number;
    roomCount: number;
    bedCount: number;
    bathroomCount: number;
    appliances: string[];
    createdAt: string; // or Date if you want to handle date objects
    updatedAt: string; // or Date if you want to handle date objects
    userId: number;
    likes: number;
    is_liked: boolean;
}