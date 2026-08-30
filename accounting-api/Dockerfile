# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["accounting-api.csproj", "./"]
RUN dotnet restore "accounting-api.csproj"

COPY . .
RUN dotnet publish "accounting-api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://0.0.0.0:5010
ENV ASPNETCORE_HTTP_PORTS=5010
EXPOSE 5010
ENTRYPOINT ["dotnet", "accounting-api.dll"]

