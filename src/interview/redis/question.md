## 什么是 Redis ？  
**以下是官方的介绍**  
**Redis** 是世界上最快的内存数据库。它为缓存、矢量搜索和 **NoSQL** 数据库提供云和本地解决方案，可无缝融入任何技术堆栈，让数字客户能够轻松构建、扩展和部署我们世界所运行的快速应用程序。  
**Redis** 提供**字符串、哈希、列表、集合、具有范围查询的有序集合**、位图、超级日志、地理空间索引和流等数据结构。  
**Redis** 具有内置复制、**Lua** 脚本、**LRU** 逐出、事务和不同级别的磁盘持久性，并通过 Redis Sentinel 提供高可用性并通过 Redis Cluster 提供自动分区。  

**个人理解**  
Redis 是一个非关系型（**NoSQL**）的内存数据库，使用一对 **Key** 和 **Value** 来存储我们的数据。  
它主要的数据结构有字符串（Strings）、哈希（Hashes）、列表（Lists）、集合（Sets）、有序集合（Sorted Sets 或者说 ZSets）。  

## Redis 为什么这么快？
1. C 语言编写。  
2. 基于内存实现，访问内存比访问磁盘更快。  
3. I/O 复用模型，基于epoll/select/kqueue等I/O多路复用技术实现高吞吐量网络I/O。  
4. 单线程模型，避免了多线程的频繁上下文切换以及锁等同步机制的开销。  

![why-redis-so-fast](/.image/interview/why-redis-so-fast.jpg)