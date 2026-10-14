FROM node:24-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src
COPY backend/CodeKid.Api/CodeKid.Api.csproj backend/CodeKid.Api/
RUN dotnet restore backend/CodeKid.Api
COPY backend/ backend/
RUN dotnet publish backend/CodeKid.Api -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=backend /out ./
COPY --from=frontend /app/frontend/dist ./wwwroot
ENV ASPNETCORE_ENVIRONMENT=Production Urls=http://0.0.0.0:8080
RUN mkdir keys && chown -R $APP_UID /app
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "CodeKid.Api.dll"]
