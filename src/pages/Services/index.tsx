import React from 'react';
import ServicesTable from './components/service-tabe';
import CreateServiceBtn from './components/create-service-btn';

const ServicesPage: React.FC = () => {
    return (
        <div className="container mx-auto flex flex-col gap-5">
            <div className='max-w-5'>
                <CreateServiceBtn />
            </div>
            <ServicesTable />
        </div>
    );
};

export default ServicesPage;