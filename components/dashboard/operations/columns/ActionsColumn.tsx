
import React from 'react';
import { Trip, TripStatus, User } from '../../../../types';
import ActionMenu from '../ActionMenu';

interface ActionsColumnProps {
  trip: Trip;
  actingUser: User;
  onEditTrip: (t: Trip) => void;
  onEditOC: (t: Trip) => void;
  onEditMinuta: (t: Trip) => void;
  onViewDoc: (url: string, title: string) => void;
  onDeleteTrip: (id: string) => void;
  onViewDriverDocs: (t: Trip) => void;
  handleFileUpload: (trip: Trip, type: any, e: React.ChangeEvent<HTMLInputElement>) => void;
  deleteDocument: (trip: Trip, type: any) => void;
  handlePrint: (url: string, fileName: string) => void;
  onSetPriority?: (t: Trip) => void;
}

export const ActionsColumn: React.FC<ActionsColumnProps> = (props) => {
  return (
    <div 
      className="flex justify-end" 
      onClick={(e) => e.stopPropagation()} // Impede que o clique no menu abra os detalhes da viagem
    >
      <ActionMenu 
        trip={props.trip}
        onEditTrip={props.onEditTrip}
        onEditOC={props.onEditOC}
        onEditMinuta={props.onEditMinuta}
        onDeleteTrip={props.onDeleteTrip}
        onViewDriverDocs={props.onViewDriverDocs}
        handleFileUpload={props.handleFileUpload}
        deleteDocument={props.deleteDocument}
        onViewDoc={props.onViewDoc}
        handlePrint={props.handlePrint}
        onSetPriority={props.onSetPriority}
      />
    </div>
  );
};
