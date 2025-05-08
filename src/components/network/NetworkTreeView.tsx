import React, { useEffect } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { NetworkMember } from '../../types';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';

interface NetworkTreeViewProps {
  data: NetworkMember;
}

const CustomNode: React.FC<{ member: NetworkMember }> = ({ member }) => {
  return (
    <div className="relative inline-block">
      <div className="bg-white rounded-lg border border-neutral-200 p-2 shadow-sm hover:shadow-md transition-shadow duration-200 min-w-52">
        <div className="flex items-center space-x-3">
          <Avatar 
            src={member.profilePicture} 
            name={member.name} 
            size="md" 
            status={member.active ? 'online' : 'offline'} 
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate">{member.name}</p>
            <p className="text-xs text-neutral-500 truncate">ID: {member.id.substring(0, 8)}...</p>
            <p className="text-xs text-neutral-500 truncate">Code: {member.referralCode}</p>
            <div className="mt-1">
              <Badge
                variant={member.active ? 'success' : 'neutral'}
                size="sm"
                rounded
              >
                {member.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NetworkTreeView: React.FC<NetworkTreeViewProps> = ({ data }) => {
  useEffect(() => {
    console.log("NetworkTreeView received data:", data);
    
    if (!data || !data.id) {
      console.log("Warning: Invalid network data provided to NetworkTreeView");
      return;
    }
    
    console.log("Children count:", data.children?.length || 0);
    if (data.children && data.children.length > 0) {
      console.log("First child:", data.children[0]);
    }
  }, [data]);

  // Recursive function to render tree nodes
  const renderTreeNodes = (member: NetworkMember) => {
    if (!member) {
      console.log("Attempted to render undefined member");
      return null;
    }
    
    console.log("Rendering node:", member.name, "with ID:", member.id, "and children:", member.children?.length || 0);
    
    if (!member.children || member.children.length === 0) {
      return (
        <TreeNode key={member.id} label={<CustomNode member={member} />} />
      );
    }

    return (
      <TreeNode key={member.id} label={<CustomNode member={member} />}>
        {member.children.map((child, index) => {
          if (!child || !child.id) {
            console.log("Warning: Invalid child at index", index);
            return null;
          }
          return (
            <React.Fragment key={child.id || `child-${index}`}>
              {renderTreeNodes(child)}
            </React.Fragment>
          );
        })}
      </TreeNode>
    );
  };

  if (!data || !data.id) {
    return <div className="p-4 text-center text-neutral-500">No network data available</div>;
  }

  return (
    <div className="p-4 overflow-auto">
      <div className="min-w-max pb-10">
        <Tree
          lineWidth="2px"
          lineColor="#0F52BA"
          lineBorderRadius="10px"
          label={<CustomNode member={data} />}
        >
          {data.children && data.children.length > 0 ? (
            data.children.map((child, index) => {
              if (!child || !child.id) {
                console.log("Warning: Invalid root child at index", index);
                return null;
              }
              return (
                <React.Fragment key={child.id || `root-child-${index}`}>
                  {renderTreeNodes(child)}
                </React.Fragment>
              );
            })
          ) : (
            <TreeNode label={<div className="text-neutral-500 text-sm p-2">No referrals yet</div>} />
          )}
        </Tree>
      </div>
    </div>
  );
};

export default NetworkTreeView;