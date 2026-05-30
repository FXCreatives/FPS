package com.contentfilter.app.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.contentfilter.app.models.BlockedSite;

import java.util.List;

public class BlockedSitesAdapter extends RecyclerView.Adapter<BlockedSitesAdapter.ViewHolder> {

    private List<BlockedSite> blockedSites;

    public BlockedSitesAdapter(List<BlockedSite> blockedSites) {
        this.blockedSites = blockedSites;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
            .inflate(android.R.layout.simple_list_item_2, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        BlockedSite blockedSite = blockedSites.get(position);

        holder.siteName.setText(blockedSite.getUrl());
        holder.siteDetails.setText(blockedSite.getReason() + " • " + blockedSite.getRelativeTime());
    }

    @Override
    public int getItemCount() {
        return blockedSites.size();
    }

    public void updateData(List<BlockedSite> newBlockedSites) {
        this.blockedSites = newBlockedSites;
        notifyDataSetChanged();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        TextView siteName;
        TextView siteDetails;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            siteName = itemView.findViewById(android.R.id.text1);
            siteDetails = itemView.findViewById(android.R.id.text2);
        }
    }
}